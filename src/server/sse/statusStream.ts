import { Request, Response } from "express";
import { getConnectorStatus, getSummaryStatus } from "@kafka/debeziumControl/services/debeziumService.js";
import { generateConnectorNamesFromPipeline } from "@kafka/debeziumControl/services/pipelineService.js";

type ConnectorType = "source" | "sink";

const clients: { res: Response; pipelineIds: string[] }[] = [];
let pollingInterval: NodeJS.Timeout | null = null;
const lastStatusMap: Record<string, any> = {};

// 🟡 Cache state
let cachedConnectorsToMonitor: {
  pipelineId: string;
  connectorName: string;
  type: ConnectorType;
}[] = [];

let lastPipelineSnapshot: string = "";
let needsRefreshConnectors = true;

export function setupStatusStreamEndpoint(app: any) {
  const POLL_INTERVAL_MS = 5000;

  app.get("/sse/status-stream", async (req: Request, res: Response) => {
    try {
      const pipelineIds = (req.query.pipelineIds as string)?.split(",") || [];
      if (!pipelineIds.length) return res.status(400).send("Missing pipelineIds");

      res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.flushHeaders();

      clients.push({ res, pipelineIds });
      needsRefreshConnectors = true;

      console.log(`🔔 New client connected, total clients: ${clients.length}`);

      if (!pollingInterval) {
        pollingInterval = setInterval(() => {
          pollAndBroadcast().catch((err) => console.error("❌ Polling error:", err));
        }, POLL_INTERVAL_MS);
        console.log("🔄 SSE polling started...");
      }

      // Initial snapshot
      const snapshotPerPipeline = await fetchStatusSnapshot(pipelineIds);
      res.write(`data: ${JSON.stringify(snapshotPerPipeline)}\n\n`);

      req.on("close", () => {
        console.log("🔔 Client disconnected");
        const index = clients.findIndex((c) => c.res === res);
        if (index !== -1) {
          clients.splice(index, 1);
          console.log(`🧹 Removed client, remaining clients: ${clients.length}`);
        } else {
          console.log("⚠️ Client not found in clients array");
        }

        needsRefreshConnectors = true;

        if (clients.length === 0 && pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;

          cachedConnectorsToMonitor = [];
          lastPipelineSnapshot = "";
          Object.keys(lastStatusMap).forEach((key) => delete lastStatusMap[key]);

          console.log("🧹 Cleared state, polling stopped (no active clients)");
        }
      });
    } catch (err) {
      console.error("❌ SSE endpoint error:", err);
      // สามารถส่ง event error ไป client ได้ถ้าต้องการ
      // res.write(`event: error\ndata: ${JSON.stringify({ message: (err as Error).message })}\n\n`);
    }
  });
}

async function fetchStatusSnapshot(pipelineIds: string[]) {
  const snapshotPerPipeline: Record<string, any[]> = {};
  const now = new Date().toISOString();

  for (const pipelineId of pipelineIds) {
    try {
      const entry = await generateConnectorNamesFromPipeline(pipelineId);
      if (!entry) continue;

      snapshotPerPipeline[pipelineId] = [];

      for (const [type, connectorName] of Object.entries(entry)) {
        try {
          const status = await getConnectorStatus(connectorName as string);
          lastStatusMap[connectorName as string] = status;

          snapshotPerPipeline[pipelineId].push({
            type,
            connectorName,
            summary_status: getSummaryStatus(status),
            timestamp: now,
            status,
          });
        } catch (connectorError) {
          console.error(`Error fetching status for connector ${connectorName}:`, connectorError);
          snapshotPerPipeline[pipelineId].push({
            type,
            connectorName,
            error: connectorError instanceof Error ? connectorError.message : connectorError,
            timestamp: now,
          });
        }
      }
    } catch (pipelineError) {
      console.error(`Error processing pipeline ${pipelineId}:`, pipelineError);
      snapshotPerPipeline[pipelineId] = [{
        error: pipelineError instanceof Error ? pipelineError.message : pipelineError,
        timestamp: now
      }];
    }
  }

  return snapshotPerPipeline;
}

async function pollAndBroadcast() {
  try {
    if (clients.length === 0) {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        console.log("🧹 Polling stopped (no clients)");
      }
      return;
    }

    const currentPipelineSnapshot = JSON.stringify(
      clients.flatMap((c) => c.pipelineIds).sort()
    );

    if (needsRefreshConnectors || currentPipelineSnapshot !== lastPipelineSnapshot) {
      cachedConnectorsToMonitor = await getAllConnectorsToMonitor();
      lastPipelineSnapshot = currentPipelineSnapshot;
      needsRefreshConnectors = false;
      console.log("🔄 Connectors to monitor refreshed");
    }

    const now = new Date().toISOString();
    const updatesPerPipeline: Record<string, any[]> = {};

    for (const { pipelineId, connectorName, type } of cachedConnectorsToMonitor) {
      let status;
      try {
        status = await getConnectorStatus(connectorName);
      } catch (statusError) {
        console.error(`Error getting status for ${connectorName}:`, statusError);
        continue; // ข้าม connector นี้
      }

      const currentState = status?.connector?.state;
      const lastState = lastStatusMap[connectorName]?.connector?.state;

      const shouldSend = !lastStatusMap[connectorName] || currentState !== lastState;

      if (shouldSend) {
        lastStatusMap[connectorName] = status;

        if (!updatesPerPipeline[pipelineId]) {
          updatesPerPipeline[pipelineId] = [];
        }

        updatesPerPipeline[pipelineId].push({
          type,
          connectorName,
          summary_status: getSummaryStatus(status),
          timestamp: now,
          status,
        });
      }
    }

    if (Object.keys(updatesPerPipeline).length > 0) {
      const grouped = Object.entries(updatesPerPipeline).map(([pipelineId, connectors]) => ({
        pipelineId,
        connectors,
      }));

      const payload = `data: ${JSON.stringify(grouped)}\n\n`;
      for (const { res } of clients) {
        res.write(payload);
      }
    }
  } catch (err) {
    console.error("❌ Unhandled error in pollAndBroadcast():", err);
  }
}

async function getAllConnectorsToMonitor(): Promise<{
  pipelineId: string;
  connectorName: string;
  type: ConnectorType;
}[]> {
  const seen = new Set<string>();
  const result: {
    pipelineId: string;
    connectorName: string;
    type: ConnectorType;
  }[] = [];

  for (const { pipelineIds } of clients) {
    for (const pipelineId of pipelineIds) {
      let connectorPair;
      try {
        connectorPair = await generateConnectorNamesFromPipeline(pipelineId);
      } catch (err) {
        console.error(`Error fetching connectors for pipeline ${pipelineId}:`, err);
        continue;
      }

      if (!connectorPair) continue;

      for (const type of ["source", "sink"] as ConnectorType[]) {
        const connectorName = connectorPair[type];
        const key = `${pipelineId}-${type}`;
        if (!seen.has(key)) {
          seen.add(key);
          result.push({
            pipelineId,
            connectorName,
            type,
          });
        }
      }
    }
  }

  return result;
}

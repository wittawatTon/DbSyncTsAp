import { Request, Response } from "express";
import { getConnectorStatus, getSummaryStatus } from "@kafka/debeziumControl/services/debeziumService.js";
import { generateConnectorNamesFromPipeline } from "@kafka/debeziumControl/services/pipelineService.js";

type ConnectorType = "source" | "sink";

const clients: { res: Response; pipelineIds: string[] }[] = [];
let pollingInterval: NodeJS.Timeout | null = null;
const lastStatusMap: Record<string, any> = {};

// 🟡 เพิ่ม state สำหรับแคช
let cachedConnectorsToMonitor: {
  pipelineId: string;
  connectorName: string;
  type: ConnectorType;
}[] = [];

let lastPipelineSnapshot: string = "";
let needsRefreshConnectors = true;

export function setupStatusStreamEndpoint(app) {
  const POLL_INTERVAL_MS = 5000;

  app.get("/sse/status-stream", async (req: Request, res: Response) => {
    const pipelineIds = (req.query.pipelineIds as string)?.split(",") || [];
    if (!pipelineIds.length) return res.status(400).send("Missing pipelineIds");

    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.flushHeaders();

    clients.push({ res, pipelineIds });
    needsRefreshConnectors = true; // 🟡 Trigger refresh

    if (!pollingInterval) {
      pollingInterval = setInterval(() => {
        pollAndBroadcast().catch((err) =>
          console.error("❌ Polling error:", err)
        );
      }, POLL_INTERVAL_MS);
      console.log("🔄 SSE polling started...");
    }

    // 🟢 Initial snapshot
    const snapshotPerPipeline = await fetchStatusSnapshot(pipelineIds);
    res.write(`data: ${JSON.stringify(snapshotPerPipeline)}\n\n`);

    req.on("close", () => {
      const index = clients.findIndex((c) => c.res === res);
      if (index !== -1) clients.splice(index, 1);
      needsRefreshConnectors = true;

      if (clients.length === 0 && pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        console.log("🛑 Polling stopped, no clients");
      }
    });
  });
}

async function fetchStatusSnapshot(pipelineIds: string[]) {
  const snapshotPerPipeline: Record<string, any[]> = {};
  const now = new Date().toISOString();

  for (const pipelineId of pipelineIds) {
    const entry = generateConnectorNamesFromPipeline[pipelineId];
    if (!entry) continue;

    snapshotPerPipeline[pipelineId] = [];

    for (const [type, connectorName] of Object.entries(entry)) {
      const status = await getConnectorStatus(connectorName as string);
      lastStatusMap[connectorName as string] = status;

      snapshotPerPipeline[pipelineId].push({
        type,
        connectorName,
        summary_status: getSummaryStatus(status),
        timestamp: now,
        status,
      });
    }
  }

  return Object.entries(snapshotPerPipeline).map(([pipelineId, connectors]) => ({
    pipelineId,
    connectors,
  }));
}

async function pollAndBroadcast() {
  try {
    const currentPipelineSnapshot = JSON.stringify(
      clients.flatMap((c) => c.pipelineIds).sort()
    );

    if (needsRefreshConnectors || currentPipelineSnapshot !== lastPipelineSnapshot) {
      cachedConnectorsToMonitor = await getAllConnectorsToMonitor();
      lastPipelineSnapshot = currentPipelineSnapshot;
      needsRefreshConnectors = false;
    }

    const now = new Date().toISOString();
    const updatesPerPipeline: Record<string, any[]> = {};

    for (const { pipelineId, connectorName, type } of cachedConnectorsToMonitor) {
      const status = await getConnectorStatus(connectorName);
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
      const connectorPair = await generateConnectorNamesFromPipeline(pipelineId);
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

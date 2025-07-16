import { PipelineService } from '@core/services/pipeline.service.js';
import { PrometheusClient } from './PrometheusClient.js';

type BufferCache = Record<string, Date>;

export class PipelineLastSuccessUpdater {
  private prometheus: PrometheusClient;
  private pipelineService: PipelineService;
  private cache: BufferCache = {};

  constructor(prometheusUrl: string) {
    this.prometheus = new PrometheusClient(prometheusUrl);
    this.pipelineService = new PipelineService();
  }

  // ดึง connector names ที่ขึ้นต้น sink.
  async getSinkConnectors(): Promise<string[]> {
    const allConnectors = await this.prometheus.getLabelValues('connector');
    return allConnectors.filter(c => c.startsWith('sink.'));
  }

  // ดึงค่า metric ล่าสุดของ connector
async fetchLatestCommitTimeForConnector(connectorName: string): Promise<Date | null> {
  // Query ดึง max_over_time สำหรับ metric แต่ละ task ที่มี label connector = connectorName
  const query = `max_over_time(kafka_connect_sink_task_offset_commit_completion{connector="${connectorName}"}[1d])`;
  
  try {
    const response = await this.prometheus.rawQuery(query);  // สมมติเพิ่ม method rawQuery เพื่อดึง raw data ทั้งหมด (ดูตัวอย่างด้านล่าง)
    const results = response.data.data.result;

    if (!results || results.length === 0) return null;

    // ดึง timestamp จาก value[0] ของแต่ละผลลัพธ์ (แต่ละ task)
    const timestamps = results.map((r: any) => parseFloat(r.value[0]));

    // หาเวลาสูงสุด (ล่าสุด)
    const latestTimestamp = Math.max(...timestamps);

    return new Date(latestTimestamp * 1000);
  } catch (error) {
    console.error('Error fetching latest commit time:', error);
    return null;
  }
}




  // แปลง connectorName เป็น pipelineId ตาม pattern sink.####.####.pipelineId
  parsePipelineIdFromConnector(connectorName: string): string | null {
    const parts = connectorName.split('.');
    // pipelineId คือส่วนสุดท้าย
    if (parts.length === 5) {
      return parts[4]; 
    }
    return null;
  }

  // เช็คและอัพเดต pipelines ที่เปลี่ยนแปลง
  async updateAll(): Promise<void> {
    const sinkConnectors = await this.getSinkConnectors();

    for (const connectorName of sinkConnectors) {
      const latestCommitTime = await this.fetchLatestCommitTimeForConnector(connectorName);
      if (latestCommitTime === null) continue;

      const cachedTime = this.cache[connectorName];
      if (cachedTime === latestCommitTime) {
        // ข้อมูลไม่เปลี่ยนแปลง ข้าม
        continue;
      }

      // อัพเดต cache
      this.cache[connectorName] = latestCommitTime;

      const pipelineId = this.parsePipelineIdFromConnector(connectorName);
      if (!pipelineId) {
        console.warn(`Cannot parse pipelineId from connector name: ${connectorName}`);
        continue;
      }


      await this.pipelineService.updateById(pipelineId, {
        lastSuccessRunAt: latestCommitTime,
      });
      console.log(`Updated lastSuccessRunAt for pipeline ${pipelineId} from connector ${connectorName} at ${latestCommitTime.toLocaleString()}`);
    }
  }
}



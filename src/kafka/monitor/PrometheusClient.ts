import axios, { AxiosResponse } from 'axios';
import dotenv from 'dotenv';

dotenv.config(); // โหลด config แค่ครั้งเดียว


export class PrometheusClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl;
  }

  async rawQuery(query: string): Promise<any> {
  try {
    const response: AxiosResponse = await axios.get(`${this.baseUrl}/api/v1/query`, {
      params: { query },
    });
    if (response.data.status === 'success') {
      return response;
    }
    throw new Error('Prometheus query failed');
  } catch (error) {
    console.error('Error running raw query:', error);
    throw error;
  }
}

  async fetchMetric(query: string): Promise<number | null> {
    try {
      const response: AxiosResponse = await axios.get(`${this.baseUrl}/api/v1/query`, {
        params: { query },
      });

      const result = response.data?.data?.result;
      if (result && result.length > 0) {
        return parseFloat(result[0].value[1]);
      }
      return null;
    } catch (error) {
      console.error('Error fetching Prometheus metric:', error);
      return null;
    }
  }

  async getLabelValues(label: string): Promise<string[]> {
    try {
      const response: AxiosResponse = await axios.get(`${this.baseUrl}/api/v1/label/${encodeURIComponent(label)}/values`);
      if (response.data.status === 'success') {
        return response.data.data as string[];
      }
      return [];
    } catch (error) {
      console.error(`Error fetching label values for ${label}:`, error);
      return [];
    }
  }
}

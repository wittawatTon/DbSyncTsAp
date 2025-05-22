interface DebeziumConfig {
  DEBEZIUM_URL: string;
  PORT: number;
}

const config: DebeziumConfig = {
  DEBEZIUM_URL: process.env.DEBEZIUM_URL || 'http://localhost:8083',
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
};

export default config;
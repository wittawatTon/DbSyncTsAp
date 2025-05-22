import { Request, Response } from 'express';
import { IDbConnection } from '@core/models/dbConnection.model';
import { getTables } from '@api/services/getTablesService';
import { testConnection } from '@api/services/databaseService';

// Define the expected shape of the request body
interface FetchTablesRequestBody {
  dbType: string;
  config: IDbConnection;
  withColumn?: boolean;
}

//TODO: FORCE TO USE SSL
/**
 * Express handler to fetch tables from a database connection.
 * @param req Express request
 * @param res Express response
 */
export const fetchTablesHandler = async (
  req: Request<any, any, FetchTablesRequestBody>,
  res: Response
): Promise<void> => {
  const { config, withColumn = false } = req.body;

  try {
    // 🛠️ ตรวจสอบการเชื่อมต่อก่อน
    const isConnected = await testConnection(config);
    if (!isConnected) {
      res.status(500).json({ error: 'Connection Failed', message: `Unable to connect to ${config.dbType} database.` });
      return;
    }

    // 📋 ดึงตารางจากฐานข้อมูล
    const tables = await getTables(config, withColumn);
    res.json({ tables });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};


/**
 * Express handler to test database connection.
 * @param req Express request
 * @param res Express response
 */
export const testConnectHandler = async (
  req: Request<any, any, { config: IDbConnection }>,
  res: Response
): Promise<void> => {
  const { config } = req.body;

  try {
    const isConnected = await testConnection(config);
    if (isConnected) {
      res.json({
        status: 'success',
        message: `✅ Database "(${config.dbType}) connected successfully.`,
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: `❌ Database "(${config.dbType}) connection failed.`,
      });
    }
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      message: `❌ Database " (${config.dbType}) connection failed: ${err.message}`,
    });
  }
};
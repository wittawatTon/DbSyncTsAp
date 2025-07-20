import { Request, Response } from 'express';
import { IDbConnection } from '@core/models/dbConnection.model.js';
import { DatabaseService } from '@core/services/databaseService.js';

// Define the expected shape of the request body
interface FetchTablesRequestBody {
  dbType: string;
  config: IDbConnection;
  withColumn?: boolean;
}

interface CreateTableRequestBody {
  config: IDbConnection;
  tableName: string;
  sqlCmd: string;
}

const databaseService = new DatabaseService();

export class DatabaseController {
  /**
   * Express handler to fetch tables from a database connection.
   */
  async fetchTables(
    req: Request<any, any, FetchTablesRequestBody>,
    res: Response
  ): Promise<void> {
    const { config, withColumn = false } = req.body;
    try {
      const isConnected = await databaseService.testDatabaseConnection(config);
      if (!isConnected) {
        res.status(400).json({
          status: 'error',
          message: `Unable to connect to ${config.dbType} database. Please check the connection configuration.`,
        });
        return;
      }

      const tables = await databaseService.getTables(config, withColumn);
      res.json({ tables });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  }

  /**
   * Express handler to test database connection.
   */
  async testConnect(
    req: Request<any, any, { config: IDbConnection }>,
    res: Response
  ): Promise<void> {
    const { config } = req.body;
    try {
      const isConnected = await databaseService.testDatabaseConnection(config);
      if (isConnected) {
        res.json({
          status: 'success',
          message: `✅ Connection to ${config.dbType} database was successful.`,
        });
      } else {
        res.status(400).json({
          status: 'error',
          message: `❌ Connection to ${config.dbType} database failed. Please check credentials and network access.`,
        });
      }
    } catch (err: any) {
      res.status(500).json({
        status: 'error',
        message: `❌ An unexpected error occurred while testing the ${config.dbType} connection: ${err.message}`,
      });
    }
  }

  /**
   * Express handler to create a table on the target DB.
   */
  async createTableHandler(
    req: Request<any, any, CreateTableRequestBody>,
    res: Response
  ): Promise<void> {
    const { config, tableName, sqlCmd } = req.body;
    try {
      const result = await databaseService.createTableOnTarget(config, tableName, sqlCmd);
      res.json({
        status: 'success',
        message: `✅ Table "${tableName}" created successfully.`,
        created: result,
      });
    } catch (err: any) {
      res.status(400).json({
        status: 'error',
        message: `❌ Failed to create table "${tableName}": ${err.message}`,
      });
    }
  }
  /**
 * Express handler to compare row counts between source and target tables.
 */
async dataDiffcountRow(
  req: Request<{ pipelineId: string }>,
  res: Response
): Promise<void> {
  const {pipelineId}  = req.body;
  try {
    const diffResult = await databaseService.dataDiffCountRow(pipelineId);
    res.json({
      status: 'success',
      data: diffResult,
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      message: `❌ Failed to perform row count diff: ${err.message}`,
    });
  }
}

}

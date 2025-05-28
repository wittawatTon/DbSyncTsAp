import { GenericService } from "./genericCrud.service.js";
import { ConnectionConfigDocument, ConnectionConfigModel } from "@core/models/connectionConfig.model.js";

export class ConnectionConfigService extends GenericService<ConnectionConfigDocument> {
  constructor(model: typeof ConnectionConfigModel) {
    super(model);
  }

  // สร้างใหม่ถ้ายังไม่มี entry ที่ซ้ำ dbType, host, port, database
  async createIfNotExist(data: Partial<ConnectionConfigDocument>): Promise<ConnectionConfigDocument | null> {
    const existing = await this.model.findOne({
      dbType: data.dbType,
      host: data.host,
      port: data.port,
      database: data.database
    }).exec();

    if (existing) {
      return null;
    }

    const created = new this.model(data);
    return created.save();
  }
}

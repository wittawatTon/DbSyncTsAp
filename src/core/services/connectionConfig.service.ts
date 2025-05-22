// services/connectionConfig.service.ts
import { GenericService } from "./genericCrud.service";
import { ConnectionConfigDocument,ConnectionConfigModel } from "@core/models/connectionConfig.model";

export const connectionConfigService = new GenericService<ConnectionConfigDocument>(ConnectionConfigModel);

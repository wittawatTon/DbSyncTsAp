// services/connectionConfig.service.ts
import { GenericService } from "./genericCrud.service.js";
import { TableDocument, TableModel } from "@core/models/tableWithMap.model.js";

export const connectionConfigService = new GenericService<TableDocument>(TableModel);

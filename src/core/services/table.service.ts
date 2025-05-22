// services/connectionConfig.service.ts
import { GenericService } from "./genericCrud.service";
import { TableDocument, TableModel } from "@core/models/table.model";

export const connectionConfigService = new GenericService<TableDocument>(TableModel);

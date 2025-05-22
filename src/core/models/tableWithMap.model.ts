import mongoose, { Schema, Document, Types, Model } from "mongoose";
import { Table } from "@core/models/type";


export interface TableDocument extends Table, Document {
  _id: Types.ObjectId;  // เพิ่ม _id เพื่อให้ตรงกับ Document
}

const tableSchema = new Schema<TableDocument>({
  id: { type: String, required: true },
  name: { type: String, required: true },
   columnMappings: {
    type: [
      {
        sourceColumn: { type: String, required: true },
        targetColumn: { type: String, required: true },
      }
    ],
    default: []
  }
}, { _id: true }); // เปลี่ยนจาก false เป็น true เพื่อให้มี _id

export const TableModel: Model<TableDocument> = mongoose.model<TableDocument>("Table", tableSchema);

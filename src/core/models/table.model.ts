import { Schema } from 'mongoose';
import ColumnSchema, { IColumn } from './column.model.js';

// สร้าง interface สำหรับ Table
export interface ITable {
  name: string;
  selected: boolean;
  columns: IColumn[];
}

// สร้าง TableSchema ด้วย type annotation
const TableSchema = new Schema<ITable>(
  {
    name: { type: String, required: true },
    selected: { type: Boolean, required: true },
    columns: { type: [ColumnSchema], required: true },
  },
  { _id: false }
);

export default TableSchema;
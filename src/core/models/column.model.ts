import { Schema } from 'mongoose';

// สร้าง interface สำหรับ Column
export interface IColumn {
  name: string;
  dataType: string;
  isPrimaryKey: boolean;
  selected: boolean;
}

// สร้าง ColumnSchema ด้วย type annotation
const ColumnSchema = new Schema<IColumn>(
  {
    name: { type: String, required: true },
    dataType: { type: String, required: true },
    isPrimaryKey: { type: Boolean, required: true },
    selected: { type: Boolean, required: true },
  },
  { _id: false }
);

export default ColumnSchema;
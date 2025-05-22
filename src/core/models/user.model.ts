import mongoose, { Document, Schema, Model } from 'mongoose';

// 1. สร้าง interface สำหรับ User document
export interface IUser extends Document {
  username: string;
  password: string;
}

// 2. สร้าง schema ด้วย type annotation
const userSchema: Schema<IUser> = new Schema<IUser>({
  username: { type: String, required: true },
  password: { type: String, required: true }
});

// 3. สร้างและ export model
const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
export default User;
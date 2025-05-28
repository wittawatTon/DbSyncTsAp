import { Model, Document, Types } from "mongoose";

interface MongoDocBase {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export class GenericService<T extends Document & MongoDocBase> {
  protected model: Model<T>;


    constructor(model: Model<T>) {
    this.model = model;
  }

  async create(data: Partial<T>): Promise<T> {
    const doc = new this.model(data);
    return await doc.save();
  }

  async findAll(): Promise<T[]> {
    // Always call select with an empty string
    return await this.model.find().select('');
  }

  async findById(id: string): Promise<T | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    // Always call select with an empty string
    return await this.model.findById(id).select('');
  }

  async updateById(id: string, update: Partial<T>): Promise<T | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return await this.model.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });
  }

  async deleteById(id: string): Promise<T | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return await this.model.findByIdAndDelete(id);
  }
}

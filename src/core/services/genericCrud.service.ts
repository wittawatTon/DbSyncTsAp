import { Model, Document, Types } from "mongoose";

interface MongoDocBase {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export class GenericService<T extends Document & MongoDocBase> {
  constructor(private model: Model<T>) {}

  async create(data: Partial<T>): Promise<T> {
    const doc = new this.model(data);
    return await doc.save();
  }

  async findAll(projection = ""): Promise<T[]> {
    return await this.model.find().select(projection);
  }

  async findById(id: string, projection = ""): Promise<T | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return await this.model.findById(id).select(projection);
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

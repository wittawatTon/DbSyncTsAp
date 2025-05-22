import mongoose from 'mongoose';

/**
 * เชื่อมต่อกับ MongoDB ด้วย Mongoose
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    mongoose.set('strictQuery', false);

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as mongoose.ConnectOptions);

    console.log('Database connected');
  } catch (err) {
    console.error('Database connection error:', err);
    throw err;
  }
};
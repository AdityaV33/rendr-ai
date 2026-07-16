
import mongoose from 'mongoose';
import { env } from './env.js';



export const connectDatabase = async (): Promise<void> => {
  try {
    if (!env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined');
    }

    await mongoose.connect(env.MONGODB_URI);

    console.log(' Connected to MongoDB Atlas');
  } catch (error) {
    console.error("Failed to connect to MongoDB Atlas");
    throw error;
}
};
import dns from 'node:dns';
import mongoose from 'mongoose';
import { env } from './env.js';

// Development workaround for networks that cannot resolve MongoDB Atlas SRV records.
// Some networks (e.g. certain hostel Wi-Fi setups) have DNS issues.
// Most developers should leave ENABLE_DNS_WORKAROUND=false.
if (env.ENABLE_DNS_WORKAROUND) {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} 


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
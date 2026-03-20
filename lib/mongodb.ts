import mongoose from 'mongoose';
import '@/lib/models/Worker';
import '@/lib/models/Employer';
import '@/lib/models/JobPosting';
import '@/lib/models/LMIAApplication';

const MONGODB_URI = process.env.MONGODB_URI;

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined');
  }
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      tlsAllowInvalidCertificates: true, // Resolve SSL Alert 80 in dev
      family: 4, // Force IPv4 to avoid resolution issues
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      return mongoose;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectToDatabase;

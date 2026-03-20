import mongoose, { Schema, Document } from 'mongoose';

export interface IWorker extends Document {
  name: string;
  email: string;
  nocCode?: string;
  targetNOC?: string;
  country: string;
  languageScore?: string;
  educationLevel?: string;
  desiredProvince?: string;
  salaryExpectation?: number;
  createdAt: Date;
}

const WorkerSchema = new Schema<IWorker>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  nocCode: { type: String },
  targetNOC: { type: String },
  country: { type: String, required: true },
  languageScore: { type: String },
  educationLevel: { type: String },
  desiredProvince: { type: String },
  salaryExpectation: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

const Worker = mongoose.models.Worker || mongoose.model<IWorker>('Worker', WorkerSchema);
export default Worker;

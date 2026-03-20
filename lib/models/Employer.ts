import mongoose, { Schema, Document } from 'mongoose';

export interface IEmployer extends Document {
  companyName: string;
  email: string;
  cra_bn?: string;
  province: string;
  industry?: string;
  jobTitle?: string;
  nocCode?: string;
  offeredWage?: number;
  employeeCount?: number;
  verificationStatus: 'pending' | 'verified' | 'failed';
  createdAt: Date;
}

const EmployerSchema = new Schema<IEmployer>({
  companyName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  cra_bn: { type: String },
  province: { type: String, required: true },
  industry: { type: String },
  jobTitle: { type: String },
  nocCode: { type: String },
  offeredWage: { type: Number },
  employeeCount: { type: Number },
  verificationStatus: { type: String, enum: ['pending', 'verified', 'failed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const Employer = mongoose.models.Employer || mongoose.model<IEmployer>('Employer', EmployerSchema);
export default Employer;

import mongoose, { Schema, Document } from 'mongoose';

export interface IJobPosting extends Document {
  jobTitle: string;
  nocCode: string;
  wage: number;
  province: string;
  employer: mongoose.Types.ObjectId;
  postedDate: Date;
  sourceUrl?: string;
  rawHtml?: string;
  tinyfishRunId?: string;
  createdAt: Date;
}

const JobPostingSchema = new Schema<IJobPosting>({
  jobTitle: { type: String, required: true },
  nocCode: { type: String, required: true },
  wage: { type: Number, required: true },
  province: { type: String, required: true },
  employer: { type: Schema.Types.ObjectId, ref: 'Employer', required: false },
  postedDate: { type: Date, default: Date.now },
  sourceUrl: { type: String },
  rawHtml: { type: String },
  tinyfishRunId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const JobPosting = mongoose.models.JobPosting || mongoose.model<IJobPosting>('JobPosting', JobPostingSchema);
export default JobPosting;

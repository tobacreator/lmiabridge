import mongoose, { Schema, Document } from 'mongoose';

export interface ILMIAApplication extends Document {
  employer: mongoose.Types.ObjectId;
  worker: mongoose.Types.ObjectId;
  jobPosting: mongoose.Types.ObjectId;
  matchScore: number;
  matchDetails?: {
    nocAlignment: number;
    wageCompliance: number;
    regionMatch: number;
    languageScore: number;
    educationMatch: number;
    totalScore: number;
    summary: string;
    lmiaViable: boolean;
  };
  complianceStatus: string;
  advertisingSchedule: Array<any>;
  transitionPlan?: any;
  compliancePack?: any;
  evidencePackUrl?: string;
  gtsEligible: boolean;
  createdAt: Date;
}

const LMIAApplicationSchema = new Schema<ILMIAApplication>({
  employer: { type: Schema.Types.ObjectId, ref: 'Employer', required: true },
  worker: { type: Schema.Types.ObjectId, ref: 'Worker', required: true },
  jobPosting: { type: Schema.Types.ObjectId, ref: 'JobPosting', required: true },
  matchScore: { type: Number, required: true },
  matchDetails: {
    nocAlignment: Number,
    wageCompliance: Number,
    regionMatch: Number,
    languageScore: Number,
    educationMatch: Number,
    totalScore: Number,
    summary: String,
    lmiaViable: Boolean
  },
  complianceStatus: { type: String, required: true },
  advertisingSchedule: { type: [Object], default: [] },
  transitionPlan: { type: Object },
  compliancePack: { type: Object },
  evidencePackUrl: { type: String },
  gtsEligible: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const LMIAApplication = mongoose.models.LMIAApplication || mongoose.model<ILMIAApplication>('LMIAApplication', LMIAApplicationSchema);
export default LMIAApplication;

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
  lmiaPathway?: 'gts' | 'standard' | null;
  complianceChecklist?: Array<{
    itemId: string;
    label: string;
    checked: boolean;
    checkedAt?: Date;
    checkedBy?: string;
  }>;
  canadianApplicantLog?: Array<{
    applicantName: string;
    dateApplied: Date;
    reasonNotSuitable: string;
    loggedAt: Date;
  }>;
  lmiaSubmittedAt?: Date;
  lmiaReferenceNumber?: string;
  lmiaDecision?: 'positive' | 'negative' | null;
  lmiaDecisionDate?: Date;
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
  lmiaPathway: { type: String, enum: ['gts', 'standard'], default: null },
  complianceChecklist: [{
    itemId: { type: String },
    label: { type: String },
    checked: { type: Boolean, default: false },
    checkedAt: { type: Date },
    checkedBy: { type: String }
  }],
  canadianApplicantLog: [{
    applicantName: { type: String },
    dateApplied: { type: Date },
    reasonNotSuitable: { type: String },
    loggedAt: { type: Date, default: Date.now }
  }],
  lmiaSubmittedAt: { type: Date },
  lmiaReferenceNumber: { type: String },
  lmiaDecision: { type: String, enum: ['positive', 'negative'], default: null },
  lmiaDecisionDate: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const LMIAApplication = mongoose.models.LMIAApplication || mongoose.model<ILMIAApplication>('LMIAApplication', LMIAApplicationSchema);
export default LMIAApplication;

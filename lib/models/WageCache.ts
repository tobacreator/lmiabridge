import mongoose, { Schema, Document } from 'mongoose';

export interface IWageCache extends Document {
  nocCode: string;
  province: string;
  data: {
    medianWage: number;
    wageLow: number;
    wageHigh: number;
    currency: string;
    period: string;
    outlook: string;
  };
  tinyfishRunId?: string;
  cachedAt: Date;
}

const WageCacheSchema = new Schema<IWageCache>({
  nocCode: { type: String, required: true },
  province: { type: String, required: true },
  data: { type: Object, required: true },
  tinyfishRunId: { type: String },
  cachedAt: { type: Date, default: Date.now, expires: 86400 } // TTL: 24 hours
});

// Compound index for fast lookups
WageCacheSchema.index({ nocCode: 1, province: 1 });

const WageCache = mongoose.models.WageCache || mongoose.model<IWageCache>('WageCache', WageCacheSchema);
export default WageCache;

import mongoose, { Schema, Document } from 'mongoose';

export interface ITelemetryEvent extends Document {
  type: string;
  path?: string;
  agent?: string;
  runId?: string;
  status?: string;
  meta?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  referer?: string;
  createdAt: Date;
}

const TelemetryEventSchema = new Schema<ITelemetryEvent>({
  type: { type: String, required: true },
  path: { type: String },
  agent: { type: String },
  runId: { type: String },
  status: { type: String },
  meta: { type: Object },
  ip: { type: String },
  userAgent: { type: String },
  referer: { type: String },
  createdAt: { type: Date, default: Date.now },
});

TelemetryEventSchema.index({ createdAt: -1 });
TelemetryEventSchema.index({ type: 1, createdAt: -1 });
TelemetryEventSchema.index({ agent: 1, createdAt: -1 });
TelemetryEventSchema.index({ runId: 1 });

const TelemetryEvent =
  mongoose.models.TelemetryEvent ||
  mongoose.model<ITelemetryEvent>('TelemetryEvent', TelemetryEventSchema);

export default TelemetryEvent;

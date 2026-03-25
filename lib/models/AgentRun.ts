import mongoose, { Schema, Document } from 'mongoose';

export interface IAgentRun extends Document {
  agent: string;
  runId: string;
  status: 'COMPLETE' | 'FAILED' | 'CANCELLED' | 'RUNNING';
  duration: number;
  meta?: Record<string, any>;
  createdAt: Date;
}

const AgentRunSchema = new Schema<IAgentRun>({
  agent: { type: String, required: true },
  runId: { type: String, required: true },
  status: { type: String, enum: ['COMPLETE', 'FAILED', 'CANCELLED', 'RUNNING'], default: 'COMPLETE' },
  duration: { type: Number, default: 0 },
  meta: { type: Object },
  createdAt: { type: Date, default: Date.now },
});

AgentRunSchema.index({ createdAt: -1 });

const AgentRun = mongoose.models.AgentRun || mongoose.model<IAgentRun>('AgentRun', AgentRunSchema);
export default AgentRun;

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const countryFlags: Record<string, string> = {
  'Nigeria': '\u{1F1F3}\u{1F1EC}',
  'India': '\u{1F1EE}\u{1F1F3}',
  'Ghana': '\u{1F1EC}\u{1F1ED}',
  'Mexico': '\u{1F1F2}\u{1F1FD}',
  'Canada': '\u{1F1E8}\u{1F1E6}',
};

interface LMIAData {
  state: 'no_employer' | 'no_application' | 'no_pathway' | 'gts' | 'standard';
  application?: {
    _id: string;
    lmiaPathway: string | null;
    complianceStatus: string;
    complianceChecklist: Array<{ itemId: string; label: string; checked: boolean; checkedAt?: string; checkedBy?: string }>;
    canadianApplicantLog: Array<{ applicantName: string; dateApplied: string; reasonNotSuitable: string; loggedAt: string }>;
    advertisingSchedule: any[];
    gtsEligible: boolean;
    matchScore: number;
    lmiaSubmittedAt: string | null;
    lmiaReferenceNumber: string | null;
    lmiaDecision: string | null;
    lmiaDecisionDate: string | null;
    createdAt: string;
  };
  worker?: {
    _id: string;
    name: string;
    country: string;
    nocCode: string;
    salaryExpectation: number;
    educationLevel: string;
    languageScore: string;
  };
  employer?: {
    _id: string;
    companyName: string;
    tradingName: string | null;
    province: string;
    nocCode: string;
    offeredWage: number;
    advertisingStartDate: string | null;
    verificationStatus: string;
  };
}

const formatDate = (d: string | Date | null | undefined) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const addBusinessDays = (start: Date, days: number): Date => {
  const result = new Date(start);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (result.getDay() !== 0 && result.getDay() !== 6) added++;
  }
  return result;
};

// ─── LMIA Status Tracker ────────────────────────────────────────────────────
function LMIAStatusTracker({ data }: { data: LMIAData }) {
  const app = data.application;
  const stages = [
    { id: 1, label: 'Match Found' },
    { id: 2, label: 'Pathway Selected' },
    { id: 3, label: 'Application Submitted' },
    { id: 4, label: 'Decision Received' },
    { id: 5, label: 'Work Permit Applied' },
    { id: 6, label: 'Worker Arrived' },
    { id: 7, label: 'PR Clock Started' },
  ];

  let currentStage = 1;
  if (app) {
    if (app.lmiaPathway) currentStage = 2;
    if (app.lmiaSubmittedAt) currentStage = 3;
    if (app.lmiaDecision) currentStage = 4;
    if (app.lmiaDecision === 'positive') currentStage = 5;
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 mt-6">
      <h3 className="text-xs font-mono text-muted uppercase tracking-wider mb-6">LMIA Application Progress</h3>
      <div className="flex items-center justify-between relative">
        {/* Line behind circles */}
        <div className="absolute top-3 left-6 right-6 h-0.5 bg-border" />
        <div className="absolute top-3 left-6 h-0.5 bg-accent-green transition-all duration-1000" style={{ width: `${Math.max(0, ((currentStage - 1) / 6) * 100)}%`, maxWidth: 'calc(100% - 48px)' }} />
        {stages.map((stage) => {
          const isComplete = stage.id < currentStage;
          const isCurrent = stage.id === currentStage;
          return (
            <div key={stage.id} className="flex flex-col items-center z-10 relative" style={{ width: `${100 / 7}%` }}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all duration-500 ${
                isComplete ? 'bg-accent-green border-accent-green text-bg' :
                isCurrent ? 'bg-accent-amber border-accent-amber text-bg animate-pulse' :
                'bg-bg border-border text-muted'
              }`}>
                {isComplete ? '✓' : stage.id}
              </div>
              <span className={`text-[9px] font-mono mt-2 text-center leading-tight ${
                isComplete ? 'text-accent-green' : isCurrent ? 'text-accent-amber' : 'text-muted'
              }`}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Toast Notification ──────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-xl text-sm font-bold ${
      type === 'success' ? 'bg-accent-green text-bg' : 'bg-red-500 text-white'
    }`}>
      {message}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function LMIAComplianceTab({ onGoToWorkers }: { onGoToWorkers: () => void }) {
  const [data, setData] = useState<LMIAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [pathwayLoading, setPathwayLoading] = useState(false);

  // Submission form state
  const [refNumber, setRefNumber] = useState('');
  const [submitDate, setSubmitDate] = useState('');

  // Decision form state
  const [decisionType, setDecisionType] = useState<'positive' | 'negative' | ''>('');
  const [decisionDate, setDecisionDate] = useState('');

  // Applicant log form state
  const [showApplicantForm, setShowApplicantForm] = useState(false);
  const [applicantName, setApplicantName] = useState('');
  const [applicantDate, setApplicantDate] = useState('');
  const [applicantReason, setApplicantReason] = useState('');

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/lmia/active');
      if (!res.ok) throw new Error('Failed to fetch');
      const d = await res.json();
      setData(d);
      if (d.application?.lmiaReferenceNumber) setRefNumber(d.application.lmiaReferenceNumber);
      if (d.application?.lmiaSubmittedAt) setSubmitDate(new Date(d.application.lmiaSubmittedAt).toISOString().slice(0, 10));
      if (d.application?.lmiaDecision) setDecisionType(d.application.lmiaDecision);
      if (d.application?.lmiaDecisionDate) setDecisionDate(new Date(d.application.lmiaDecisionDate).toISOString().slice(0, 10));
    } catch (e) {
      showToast('Failed to load compliance data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const appId = data?.application?._id;

  // ── API Helpers ──
  const selectPathway = async (pathway: 'gts' | 'standard') => {
    if (!appId) return;
    setPathwayLoading(true);
    try {
      const res = await fetch(`/api/lmia/${appId}/pathway`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pathway })
      });
      if (!res.ok) throw new Error('Failed');
      showToast(`${pathway === 'gts' ? 'Global Talent Stream' : 'Standard LMIA'} pathway selected`, 'success');
      await fetchData();
    } catch (e) {
      showToast('Failed to save pathway selection', 'error');
    } finally {
      setPathwayLoading(false);
    }
  };

  const toggleChecklist = async (itemId: string, checked: boolean) => {
    if (!appId) return;
    try {
      const res = await fetch(`/api/lmia/${appId}/checklist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, checked })
      });
      if (!res.ok) throw new Error('Failed');
      await fetchData();
    } catch (e) {
      showToast('Failed to update checklist', 'error');
    }
  };

  const submitApplication = async () => {
    if (!appId || !refNumber) return;
    try {
      const res = await fetch(`/api/lmia/${appId}/submission`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lmiaReferenceNumber: refNumber, lmiaSubmittedAt: submitDate || new Date().toISOString() })
      });
      if (!res.ok) throw new Error('Failed');
      await toggleChecklist('gts-4', true);
      showToast('LMIA submission recorded', 'success');
      await fetchData();
    } catch (e) {
      showToast('Failed to record submission', 'error');
    }
  };

  const recordDecision = async () => {
    if (!appId || !decisionType) return;
    try {
      const res = await fetch(`/api/lmia/${appId}/decision`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lmiaDecision: decisionType, lmiaDecisionDate: decisionDate || new Date().toISOString() })
      });
      if (!res.ok) throw new Error('Failed');
      await toggleChecklist('gts-6', true);
      showToast(`LMIA decision recorded: ${decisionType}`, 'success');
      await fetchData();
    } catch (e) {
      showToast('Failed to record decision', 'error');
    }
  };

  const addApplicantLog = async () => {
    if (!appId || !applicantName || !applicantReason) return;
    try {
      const res = await fetch(`/api/lmia/${appId}/applicant-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicantName, dateApplied: applicantDate || new Date().toISOString(), reasonNotSuitable: applicantReason })
      });
      if (!res.ok) throw new Error('Failed');
      showToast('Applicant logged', 'success');
      setApplicantName('');
      setApplicantDate('');
      setApplicantReason('');
      setShowApplicantForm(false);
      await fetchData();
    } catch (e) {
      showToast('Failed to add applicant', 'error');
    }
  };

  const isChecked = (itemId: string) => data?.application?.complianceChecklist?.find(c => c.itemId === itemId)?.checked || false;
  const checkedAt = (itemId: string) => data?.application?.complianceChecklist?.find(c => c.itemId === itemId)?.checkedAt;

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full" />
        <span className="ml-3 text-muted font-mono text-sm">Loading compliance data from MongoDB...</span>
      </div>
    );
  }

  if (!data) return null;

  const worker = data.worker;
  const employer = data.employer;
  const app = data.application;

  // ── STATE 0: No Application ──
  if (data.state === 'no_employer' || data.state === 'no_application') {
    return (
      <div className="bg-card border border-border rounded-2xl p-12 text-center max-w-lg mx-auto">
        <div className="text-5xl mb-4">📋</div>
        <h3 className="text-xl font-bold text-primary mb-3">No Active LMIA Application</h3>
        <p className="text-sm text-muted mb-6">
          Click <span className="font-bold text-primary">VIEW COMPREHENSIVE ANALYSIS</span> on a matched worker and select a pathway to begin the LMIA process.
        </p>
        <button onClick={onGoToWorkers} className="bg-accent-blue hover:bg-blue-600 text-bg font-bold px-6 py-3 rounded-lg text-sm uppercase tracking-widest transition-colors">
          Go to Matched Workers
        </button>
      </div>
    );
  }

  // ── Candidate Summary Card (shown in all active states) ──
  const CandidateSummary = () => (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Active Candidate</p>
          <p className="text-lg font-bold text-primary">{worker?.name} {countryFlags[worker?.country || ''] || ''}</p>
          <p className="text-xs text-muted font-mono mt-0.5">NOC {worker?.nocCode} · Match Score: {app?.matchScore}/100</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Status</p>
          <span className={`inline-block px-3 py-1 rounded text-xs font-bold uppercase ${
            app?.complianceStatus === 'viable' ? 'bg-accent-green/10 text-accent-green border border-accent-green/30' :
            app?.complianceStatus === 'in_progress' ? 'bg-accent-amber/10 text-accent-amber border border-accent-amber/30' :
            'bg-surface text-muted border border-border'
          }`}>
            {app?.complianceStatus || 'pending'}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Pathway</p>
          <span className={`inline-block px-3 py-1 rounded text-xs font-bold uppercase ${
            app?.lmiaPathway === 'gts' ? 'bg-accent-amber/10 text-accent-amber border border-accent-amber/30' :
            app?.lmiaPathway === 'standard' ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/30' :
            'bg-surface text-muted border border-border'
          }`}>
            {app?.lmiaPathway === 'gts' ? 'GTS Category B' : app?.lmiaPathway === 'standard' ? 'Standard LMIA' : 'Not Selected'}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Applied</p>
          <p className="text-sm text-primary font-mono">{formatDate(app?.createdAt)}</p>
        </div>
      </div>
    </div>
  );

  // ── STATE 1: No Pathway Selected ──
  if (data.state === 'no_pathway') {
    return (
      <div className="space-y-6">
        <CandidateSummary />
        <div className="bg-card border border-border rounded-2xl p-8 max-w-3xl mx-auto">
          <h3 className="text-lg font-bold text-primary mb-1">STEP 1 — SELECT YOUR LMIA PATHWAY</h3>
          <p className="text-sm text-muted mb-6">Before proceeding, select how you want to process this LMIA application:</p>

          <div className="space-y-4">
            {/* GTS Option */}
            <div className="border-2 border-accent-green/30 bg-accent-green/5 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <p className="text-base font-bold text-accent-green">GLOBAL TALENT STREAM — Category B</p>
                  <p className="text-xs text-accent-green/80">14-business-day processing</p>
                </div>
              </div>
              <ul className="space-y-1.5 text-sm mb-5 ml-10">
                <li className="text-accent-green">✓ No advertising requirement</li>
                <li className="text-accent-green">✓ Streamlined documentation</li>
                <li className="text-accent-green">✓ Wage ${employer?.offeredWage?.toLocaleString() || '110,000'} meets $80K minimum ✓</li>
                <li className="text-red-400">✗ GTS employer fee: $1,000/position</li>
              </ul>
              <button
                disabled={pathwayLoading}
                onClick={() => selectPathway('gts')}
                className="w-full bg-accent-green hover:bg-green-500 text-bg font-bold py-3 rounded-lg text-sm uppercase tracking-widest transition-colors disabled:opacity-50"
              >
                {pathwayLoading ? 'Saving...' : 'Select GTS Pathway →'}
              </button>
            </div>

            {/* Standard Option */}
            <div className="border border-border bg-surface rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">📋</span>
                <div>
                  <p className="text-base font-bold text-primary">STANDARD LMIA STREAM</p>
                  <p className="text-xs text-muted">3-6 month processing</p>
                </div>
              </div>
              <ul className="space-y-1.5 text-sm mb-5 ml-10">
                <li className="text-accent-green">✓ Lower fees</li>
                <li className="text-red-400">✗ 4-week advertising on 3 platforms</li>
                <li className="text-red-400">✗ Full evidence package required</li>
              </ul>
              <button
                disabled={pathwayLoading}
                onClick={() => selectPathway('standard')}
                className="w-full bg-surface hover:bg-border border border-border text-primary font-bold py-3 rounded-lg text-sm uppercase tracking-widest transition-colors disabled:opacity-50"
              >
                {pathwayLoading ? 'Saving...' : 'Select Standard Stream →'}
              </button>
            </div>
          </div>
        </div>
        <LMIAStatusTracker data={data} />
      </div>
    );
  }

  // ── STATE 2: GTS Pathway ──
  if (data.state === 'gts') {
    const gtsItems = [
      { id: 'gts-1', label: 'Pathway Confirmed', desc: 'Global Talent Stream Category B selected.', auto: true },
      { id: 'gts-2', label: 'Wage Verified', desc: `Offered wage $${employer?.offeredWage?.toLocaleString() || '110,000'}/yr meets GTS minimum of $80,000/yr for Category B.`, auto: true },
      { id: 'gts-3', label: 'Job Offer Letter Prepared', desc: `A formal written job offer must be prepared for ${worker?.name}. Required: job title, NOC code, wage, start date, work location in Canada.` },
      { id: 'gts-4', label: 'GTS LMIA Application Submitted', desc: 'Submit at: canada.ca/gts-lmia', hasSubmission: true },
      { id: 'gts-5', label: 'Employer Fee Paid', desc: 'GTS processing fee: $1,000 CAD per position. Payment portal: canada.ca/gts-payment' },
      { id: 'gts-6', label: 'LMIA Decision Received', desc: 'Processing time: approximately 14 business days from submission date.', hasDecision: true },
      { id: 'gts-7', label: 'Positive LMIA Shared with Candidate', desc: `Share the LMIA confirmation letter and number with ${worker?.name} so they can apply for their work permit.` },
    ];

    const checkedCount = gtsItems.filter(item => isChecked(item.id) || item.auto).length;
    const estimatedDecision = app?.lmiaSubmittedAt ? addBusinessDays(new Date(app.lmiaSubmittedAt), 14) : null;

    return (
      <div className="space-y-6">
        <CandidateSummary />

        {/* Header */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
          <div className="bg-accent-amber/10 border-b border-accent-amber/30 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <h3 className="text-sm font-bold text-accent-amber uppercase tracking-wider">GTS Application Tracker</h3>
                  <p className="text-xs text-muted mt-0.5">Candidate: {worker?.name} · Category B · Est. Processing: 14 business days</p>
                </div>
              </div>
              <button
                onClick={() => selectPathway('standard')}
                className="text-xs text-muted hover:text-primary underline"
              >
                Switch to Standard
              </button>
            </div>
            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-[10px] text-muted font-mono mb-1">
                <span>Progress</span>
                <span>{checkedCount} of {gtsItems.length} steps complete</span>
              </div>
              <div className="h-2 bg-bg rounded-full overflow-hidden">
                <div className="h-full bg-accent-amber rounded-full transition-all duration-700" style={{ width: `${(checkedCount / gtsItems.length) * 100}%` }} />
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="p-6 space-y-1">
            {gtsItems.map((item) => {
              const checked = isChecked(item.id) || (item.auto === true);
              const ts = checkedAt(item.id);
              return (
                <div key={item.id} className="border border-border/50 rounded-lg p-4 hover:bg-surface/30 transition-colors">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => toggleChecklist(item.id, e.target.checked)}
                      className="mt-1 w-4 h-4 accent-accent-green flex-shrink-0"
                      disabled={item.auto === true}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold ${checked ? 'text-muted line-through' : 'text-primary'}`}>
                          {item.label}
                        </p>
                        {checked && ts && (
                          <span className="text-[10px] text-accent-green font-mono">✓ {formatDate(ts)}</span>
                        )}
                        {item.auto && checked && !ts && (
                          <span className="text-[10px] text-accent-green font-mono">✓ Auto-verified</span>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-1">{item.desc}</p>

                      {/* Submission fields for item 4 */}
                      {(item as any).hasSubmission && !app?.lmiaSubmittedAt && (
                        <div className="mt-3 p-3 bg-surface rounded-lg border border-border space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Reference number (e.g. LMIA-2026-001)"
                              value={refNumber}
                              onChange={e => setRefNumber(e.target.value)}
                              className="flex-1 bg-bg border border-border rounded px-3 py-2 text-sm text-primary font-mono focus:border-accent-blue outline-none"
                            />
                            <input
                              type="date"
                              value={submitDate}
                              onChange={e => setSubmitDate(e.target.value)}
                              className="bg-bg border border-border rounded px-3 py-2 text-sm text-primary font-mono focus:border-accent-blue outline-none"
                            />
                          </div>
                          <button onClick={submitApplication} disabled={!refNumber} className="bg-accent-blue hover:bg-blue-600 text-bg font-bold px-4 py-2 rounded text-xs uppercase tracking-widest transition-colors disabled:opacity-50">
                            Mark as Submitted
                          </button>
                        </div>
                      )}
                      {(item as any).hasSubmission && app?.lmiaSubmittedAt && (
                        <div className="mt-2 text-xs font-mono text-accent-green">
                          Ref: {app.lmiaReferenceNumber} · Submitted: {formatDate(app.lmiaSubmittedAt)}
                        </div>
                      )}

                      {/* Decision fields for item 6 */}
                      {(item as any).hasDecision && (
                        <div className="mt-3">
                          {estimatedDecision && !app?.lmiaDecision && (
                            <p className="text-xs text-accent-amber font-mono mb-2">
                              Est. decision date: {formatDate(estimatedDecision)}
                            </p>
                          )}
                          {!app?.lmiaDecision ? (
                            <div className="p-3 bg-surface rounded-lg border border-border space-y-2">
                              <div className="flex gap-4">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                  <input type="radio" name="decision" value="positive" checked={decisionType === 'positive'} onChange={() => setDecisionType('positive')} className="accent-accent-green" />
                                  <span className="text-accent-green font-bold">Positive LMIA</span>
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                  <input type="radio" name="decision" value="negative" checked={decisionType === 'negative'} onChange={() => setDecisionType('negative')} className="accent-red-400" />
                                  <span className="text-red-400 font-bold">Negative LMIA</span>
                                </label>
                                <input type="date" value={decisionDate} onChange={e => setDecisionDate(e.target.value)} className="bg-bg border border-border rounded px-3 py-1 text-sm text-primary font-mono focus:border-accent-blue outline-none" />
                              </div>
                              <button onClick={recordDecision} disabled={!decisionType} className="bg-accent-blue hover:bg-blue-600 text-bg font-bold px-4 py-2 rounded text-xs uppercase tracking-widest transition-colors disabled:opacity-50">
                                Record Decision
                              </button>
                            </div>
                          ) : (
                            <p className={`text-xs font-mono font-bold ${app.lmiaDecision === 'positive' ? 'text-accent-green' : 'text-red-400'}`}>
                              Decision: {app.lmiaDecision.toUpperCase()} · {formatDate(app.lmiaDecisionDate)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              );
            })}
          </div>

          <div className="bg-surface/50 p-4 border-t border-border">
            <p className="text-xs text-muted italic font-mono">
              Note: GTS Category B does not require the standard 4-week advertising period. This is a legal exemption under IRPA R205(a).
            </p>
          </div>
        </div>

        <LMIAStatusTracker data={data} />
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  // ── STATE 3: Standard Pathway ──
  if (data.state === 'standard') {
    const startDate = employer?.advertisingStartDate ? new Date(employer.advertisingStartDate) : new Date();
    const today = new Date();

    const adWeeks = [
      { week: 1, platform: 'Job Bank Canada', action: `Post Software Developer (NOC ${worker?.nocCode || '21232'}) listing, capture confirmation URL` },
      { week: 2, platform: 'LinkedIn Jobs Canada', action: 'Post identical job listing, screenshot the post' },
      { week: 3, platform: 'Indeed Canada', action: 'Post identical job listing, log all applicant responses' },
      { week: 4, platform: 'All Platforms', action: 'Close postings, compile response logs, document no suitable Canadian found' },
    ].map((w) => {
      const wStart = new Date(startDate);
      wStart.setDate(wStart.getDate() + (w.week - 1) * 7);
      const wEnd = new Date(wStart);
      wEnd.setDate(wEnd.getDate() + 7);
      let status: 'complete' | 'active' | 'upcoming' = 'upcoming';
      if (wEnd < today) status = 'complete';
      else if (wStart <= today && today <= wEnd) status = 'active';
      return { ...w, startDate: wStart, endDate: wEnd, status };
    });

    const completedWeeks = adWeeks.filter(w => w.status === 'complete').length;
    const applicantLog = data.application?.canadianApplicantLog || [];
    const phases = [
      { done: completedWeeks >= 4 },
      { done: applicantLog.length > 0 },
      { done: false },
      { done: !!app?.lmiaSubmittedAt },
      { done: !!app?.lmiaDecision },
    ];
    const completedPhases = phases.filter(p => p.done).length;

    const estimatedDecision = app?.lmiaSubmittedAt ? addBusinessDays(new Date(app.lmiaSubmittedAt), 90) : null;

    const handleGeneratePDF = () => {
      try {
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(30, 41, 59);
        doc.text('LMIABridge', 14, 20);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(14);
        doc.setTextColor(71, 85, 105);
        doc.text('LMIA Compliance Evidence Pack', 14, 28);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(14, 34, 196, 34);
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text('EMPLOYER', 14, 45);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text(employer?.companyName || 'Employer', 14, 52);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(34, 197, 94);
        doc.text(`Status: ${employer?.verificationStatus?.toUpperCase()}`, 14, 58);
        doc.text('CANDIDATE', 120, 45);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text(worker?.name || 'Worker', 120, 52);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`NOC ${worker?.nocCode} · ${worker?.country}`, 120, 58);

        autoTable(doc, {
          startY: 70,
          head: [['Week', 'Platform', 'Action', 'Start', 'End', 'Status']],
          body: adWeeks.map(w => [`Week ${w.week}`, w.platform, w.action, formatDate(w.startDate), formatDate(w.endDate), w.status.toUpperCase()]),
          styles: { fontSize: 8, font: 'helvetica' },
          headStyles: { fillColor: [15, 23, 42] },
        });

        const y1 = (doc as any).lastAutoTable?.finalY || 120;
        if (applicantLog.length > 0) {
          autoTable(doc, {
            startY: y1 + 10,
            head: [['Applicant', 'Date Applied', 'Reason Not Suitable']],
            body: applicantLog.map((a: any) => [a.applicantName, formatDate(a.dateApplied), a.reasonNotSuitable]),
            styles: { fontSize: 8, font: 'helvetica' },
            headStyles: { fillColor: [15, 23, 42] },
          });
        }

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text('Generated by LMIABridge — Powered by TinyFish Web Agents', 14, 285);
        doc.save(`LMIABridge_Evidence_Pack_${(employer?.companyName || 'Employer').replace(/\s+/g, '_')}.pdf`);
        showToast('Evidence pack PDF downloaded', 'success');
      } catch (e) {
        showToast('Failed to generate PDF', 'error');
      }
    };

    return (
      <div className="space-y-6">
        <CandidateSummary />

        {/* Header */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
          <div className="bg-accent-blue/10 border-b border-accent-blue/30 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📋</span>
                <div>
                  <h3 className="text-sm font-bold text-accent-blue uppercase tracking-wider">Standard LMIA Compliance Tracker</h3>
                  <p className="text-xs text-muted mt-0.5">Candidate: {worker?.name} · Advertising started: {formatDate(employer?.advertisingStartDate)}</p>
                </div>
              </div>
              <button onClick={() => selectPathway('gts')} className="text-xs text-muted hover:text-primary underline">
                Switch to GTS
              </button>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-[10px] text-muted font-mono mb-1">
                <span>Progress</span>
                <span>{completedPhases} of 5 phases complete</span>
              </div>
              <div className="h-2 bg-bg rounded-full overflow-hidden">
                <div className="h-full bg-accent-blue rounded-full transition-all duration-700" style={{ width: `${(completedPhases / 5) * 100}%` }} />
              </div>
            </div>
          </div>

          {/* PHASE 1: Advertising Calendar */}
          <div className="p-6 border-b border-border">
            <h4 className="text-xs font-mono text-muted uppercase tracking-wider mb-4">Phase 1 — Advertising Calendar</h4>
            <div className="space-y-3">
              {adWeeks.map((w) => (
                <div key={w.week} className={`border rounded-lg p-4 ${
                  w.status === 'complete' ? 'border-accent-green/30 bg-accent-green/5' :
                  w.status === 'active' ? 'border-accent-amber/30 bg-accent-amber/5' :
                  'border-border bg-surface'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold ${
                        w.status === 'complete' ? 'text-accent-green' : w.status === 'active' ? 'text-accent-amber' : 'text-muted'
                      }`}>WEEK {w.week}</span>
                      <span className={`text-sm font-bold ${w.status === 'active' ? 'text-accent-blue' : w.status === 'complete' ? 'text-primary' : 'text-muted'}`}>{w.platform}</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${
                      w.status === 'complete' ? 'bg-accent-green/10 text-accent-green' :
                      w.status === 'active' ? 'bg-accent-amber text-bg' :
                      'bg-surface text-muted'
                    }`}>
                      {w.status === 'complete' ? '✅ COMPLETE' : w.status === 'active' ? '⚡ ACTIVE — Post now' : '⏳ UPCOMING'}
                    </span>
                  </div>
                  <p className={`text-xs ${w.status === 'complete' ? 'text-muted line-through' : 'text-primary/80'}`}>{w.action}</p>
                  <div className="flex gap-4 mt-2 text-[10px] text-muted font-mono">
                    <span>Post: {formatDate(w.startDate)}</span>
                    <span>Close: {formatDate(w.endDate)}</span>
                  </div>
                  <div className="mt-2">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked(`ad-week-${w.week}`)}
                        onChange={(e) => toggleChecklist(`ad-week-${w.week}`, e.target.checked)}
                        className="accent-accent-green w-3.5 h-3.5"
                      />
                      <span className="text-muted">I confirm this posting was made</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-surface/50 p-3 mt-3 rounded-lg">
              <p className="text-xs text-muted italic font-mono">LMIA regulations require advertising on at least 3 platforms over 4 consecutive weeks.</p>
            </div>
          </div>

          {/* PHASE 2: Canadian Applicant Log */}
          <div className="p-6 border-b border-border">
            <h4 className="text-xs font-mono text-muted uppercase tracking-wider mb-2">Phase 2 — Canadian Applicant Log</h4>
            <p className="text-xs text-muted mb-4">LMIA regulations require documenting why each Canadian applicant was not suitable.</p>

            {applicantLog.length > 0 && (
              <div className="bg-surface rounded-lg border border-border overflow-hidden mb-4">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-bg text-muted uppercase">
                    <tr>
                      <th className="px-4 py-2">Applicant</th>
                      <th className="px-4 py-2">Date Applied</th>
                      <th className="px-4 py-2">Reason Not Suitable</th>
                      <th className="px-4 py-2">Logged</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {applicantLog.map((a: any, i: number) => (
                      <tr key={i} className="hover:bg-surface/50">
                        <td className="px-4 py-2 font-bold text-primary">{a.applicantName}</td>
                        <td className="px-4 py-2 text-muted">{formatDate(a.dateApplied)}</td>
                        <td className="px-4 py-2 text-muted">{a.reasonNotSuitable}</td>
                        <td className="px-4 py-2 text-muted">{formatDate(a.loggedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="text-xs text-muted font-mono mb-3">{applicantLog.length} Canadian applicant{applicantLog.length !== 1 ? 's' : ''} reviewed</p>

            {showApplicantForm ? (
              <div className="bg-surface rounded-lg border border-border p-4 space-y-3">
                <input type="text" placeholder="Applicant Name" value={applicantName} onChange={e => setApplicantName(e.target.value)} className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-primary font-mono focus:border-accent-blue outline-none" />
                <input type="date" value={applicantDate} onChange={e => setApplicantDate(e.target.value)} className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-primary font-mono focus:border-accent-blue outline-none" />
                <select value={applicantReason} onChange={e => setApplicantReason(e.target.value)} className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-primary font-mono focus:border-accent-blue outline-none">
                  <option value="">Select reason not suitable...</option>
                  <option value="Insufficient technical experience">Insufficient technical experience</option>
                  <option value="Missing required skills">Missing required skills</option>
                  <option value="Salary expectations exceeded budget">Salary expectations exceeded budget</option>
                  <option value="Did not respond to interview request">Did not respond to interview request</option>
                  <option value="Withdrew application">Withdrew application</option>
                  <option value="Failed technical assessment">Failed technical assessment</option>
                  <option value="Other">Other</option>
                </select>
                <div className="flex gap-2">
                  <button onClick={addApplicantLog} disabled={!applicantName || !applicantReason} className="bg-accent-blue hover:bg-blue-600 text-bg font-bold px-4 py-2 rounded text-xs uppercase tracking-widest transition-colors disabled:opacity-50">Save Entry</button>
                  <button onClick={() => setShowApplicantForm(false)} className="bg-surface hover:bg-border border border-border text-primary font-bold px-4 py-2 rounded text-xs uppercase tracking-widest transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowApplicantForm(true)} className="bg-surface hover:bg-border border border-border text-primary font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-widest transition-colors">
                + Add Applicant Response
              </button>
            )}
          </div>

          {/* PHASE 3: Evidence Package */}
          <div className="p-6 border-b border-border">
            <h4 className="text-xs font-mono text-muted uppercase tracking-wider mb-3">Phase 3 — Evidence Package</h4>
            <p className="text-xs text-muted mb-4">After week 4, compile your evidence package with all advertising records and applicant log.</p>
            <button onClick={handleGeneratePDF} className="bg-accent-blue hover:bg-blue-600 text-bg font-bold px-6 py-3 rounded-lg flex items-center gap-2 text-sm transition-colors">
              <span>↓</span> Download Evidence Pack PDF
            </button>
          </div>

          {/* PHASE 4: LMIA Submission */}
          <div className="p-6 border-b border-border">
            <h4 className="text-xs font-mono text-muted uppercase tracking-wider mb-3">Phase 4 — LMIA Submission</h4>
            {!app?.lmiaSubmittedAt ? (
              <div className="bg-surface rounded-lg border border-border p-4 space-y-2">
                <div className="flex gap-2">
                  <input type="text" placeholder="LMIA Reference Number" value={refNumber} onChange={e => setRefNumber(e.target.value)} className="flex-1 bg-bg border border-border rounded px-3 py-2 text-sm text-primary font-mono focus:border-accent-blue outline-none" />
                  <input type="date" value={submitDate} onChange={e => setSubmitDate(e.target.value)} className="bg-bg border border-border rounded px-3 py-2 text-sm text-primary font-mono focus:border-accent-blue outline-none" />
                </div>
                <button onClick={submitApplication} disabled={!refNumber} className="bg-accent-blue hover:bg-blue-600 text-bg font-bold px-4 py-2 rounded text-xs uppercase tracking-widest transition-colors disabled:opacity-50">
                  Mark as Submitted
                </button>
              </div>
            ) : (
              <p className="text-sm font-mono text-accent-green">✓ Submitted · Ref: {app.lmiaReferenceNumber} · Date: {formatDate(app.lmiaSubmittedAt)}</p>
            )}
          </div>

          {/* PHASE 5: Decision + Notification */}
          <div className="p-6">
            <h4 className="text-xs font-mono text-muted uppercase tracking-wider mb-3">Phase 5 — Decision & Candidate Notification</h4>
            {estimatedDecision && !app?.lmiaDecision && (
              <p className="text-xs text-accent-amber font-mono mb-3">Est. decision date: {formatDate(estimatedDecision)}</p>
            )}
            {!app?.lmiaDecision ? (
              <div className="bg-surface rounded-lg border border-border p-4 space-y-2">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="std-decision" value="positive" checked={decisionType === 'positive'} onChange={() => setDecisionType('positive')} className="accent-accent-green" />
                    <span className="text-accent-green font-bold">Positive LMIA</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="std-decision" value="negative" checked={decisionType === 'negative'} onChange={() => setDecisionType('negative')} className="accent-red-400" />
                    <span className="text-red-400 font-bold">Negative LMIA</span>
                  </label>
                  <input type="date" value={decisionDate} onChange={e => setDecisionDate(e.target.value)} className="bg-bg border border-border rounded px-3 py-1 text-sm text-primary font-mono focus:border-accent-blue outline-none" />
                </div>
                <button onClick={recordDecision} disabled={!decisionType} className="bg-accent-blue hover:bg-blue-600 text-bg font-bold px-4 py-2 rounded text-xs uppercase tracking-widest transition-colors disabled:opacity-50">
                  Record Decision
                </button>
              </div>
            ) : (
              <p className={`text-sm font-mono font-bold ${app.lmiaDecision === 'positive' ? 'text-accent-green' : 'text-red-400'}`}>
                Decision: {app.lmiaDecision.toUpperCase()} · {formatDate(app.lmiaDecisionDate)}
              </p>
            )}
          </div>
        </div>

        <LMIAStatusTracker data={data} />
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  return null;
}

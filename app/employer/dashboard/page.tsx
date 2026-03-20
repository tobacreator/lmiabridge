'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import LMIAComplianceTab from './LMIAComplianceTab';

interface Worker {
  _id: string;
  name: string;
  nocCode: string;
  matchScore: number;
  location: string;
  country: string;
  educationLevel: string;
  languageScore: string;
  salaryExpectation: number;
  status: string;
  matchDetails: {
    nocAlignment: number;
    wageCompliance: number;
    regionMatch: number;
    languageScore: number;
    educationMatch: number;
    totalScore: number;
    summary: string;
    lmiaViable: boolean;
  } | null;
  gtsEligible: boolean;
  lmiaPathway: string | null;
  applicationId: string | null;
  complianceStatus: string;
  summary: string;
  currentJobTitle?: string;
  currentEmployer?: string;
  yearsExperience?: number;
  technicalSkills?: string[];
  institutionName?: string;
  professionalSummary?: string;
}

const countryFlags: Record<string, string> = {
  'Nigeria': '🇳🇬',
  'India': '🇮🇳',
  'Ghana': '🇬🇭',
  'Mexico': '🇲🇽',
  'Canada': '🇨🇦',
};

interface AgentRun {
  runId: string;
  timestamp: string;
  agent: string;
  status: 'COMPLETE' | 'FAILED' | 'RUNNING';
  duration: string;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const employerId = searchParams.get('id');

  const [activeTab, setActiveTab] = useState('workers');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [lmiaPathway, setLmiaPathway] = useState<'gts' | 'standard' | null>(null);
  const [pathwayLoading, setPathwayLoading] = useState(false);

  const handleSelectPathway = async (pathway: 'gts' | 'standard') => {
    if (!selectedWorker?.applicationId) return;
    setPathwayLoading(true);
    try {
      const res = await fetch(`/api/lmia/${selectedWorker.applicationId}/pathway`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pathway })
      });
      if (res.ok) {
        setLmiaPathway(pathway);
        setWorkers(prev => prev.map(w => 
          w._id === selectedWorker._id ? { ...w, lmiaPathway: pathway } : w
        ));
        setSelectedWorker(prev => prev ? { ...prev, lmiaPathway: pathway } : null);
      }
    } catch (e) {
      console.error('Failed to set pathway:', e);
    } finally {
      setPathwayLoading(false);
    }
  };

  // Live dashboard stats from MongoDB
  const [stats, setStats] = useState({
    totalMatched: 0,
    gtsEligible: 0,
    verificationStatus: 'pending',
    companyName: null as string | null,
    tradingName: null as string | null,
    jobTitle: null as string | null,
    nocCode: null as string | null,
    reputationScore: 0,
    reputationLabel: 'New Account',
    employerId: null as string | null,
  });

  const repScore = stats.reputationScore;
  const repLabel = stats.reputationLabel;
  let repColor = 'text-muted border-border bg-surface';
  let repBarColor = 'bg-muted';

  if (repScore >= 80) {
    repColor = 'text-accent-blue border-accent-blue/30 bg-accent-blue/10';
    repBarColor = 'bg-accent-blue shadow-[0_0_10px_rgba(77,166,255,0.8)]';
  } else if (repScore >= 50) {
    repColor = 'text-accent-green border-accent-green/30 bg-accent-green/10';
    repBarColor = 'bg-accent-green shadow-[0_0_10px_rgba(0,255,148,0.8)]';
  }

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [workersRes, statsRes, activityRes] = await Promise.allSettled([
          fetch('/api/workers').then(r => r.json()),
          fetch('/api/dashboard/stats').then(r => r.json()),
          fetch('/api/agents/activity').then(r => r.json()),
        ]);

        if (workersRes.status === 'fulfilled' && Array.isArray(workersRes.value)) {
          setWorkers(workersRes.value);
        }
        if (statsRes.status === 'fulfilled') {
          setStats(statsRes.value);
          // 3A: If no employerId in URL but we have one from stats, redirect
          if (statsRes.value.employerId && !employerId) {
            router.replace(`/employer/dashboard?id=${statsRes.value.employerId}`);
          }
        }
        if (activityRes.status === 'fulfilled' && Array.isArray(activityRes.value)) {
          setAgentRuns(activityRes.value);
        }
      } catch (err) {
        console.error('[Dashboard] Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [employerId, router]);

  const tabs = [
    { id: 'workers', label: 'Matched Workers', icon: '👤' },
    { id: 'compliance', label: 'LMIA Compliance', icon: '📅' },
    { id: 'transition', label: 'Transition Plan', icon: '📄' },
    { id: 'activity', label: 'Agent Activity', icon: '🤖' }
  ];

  // ComplianceCalendar removed — replaced by LMIAComplianceTab component


  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-[1400px] mx-auto py-8 px-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-accent-green to-accent-blue rounded-2xl flex items-center justify-center text-3xl font-black text-bg shadow-2xl">
                LB
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl font-bold text-white font-mono tracking-tighter">{stats.tradingName || stats.companyName || 'LMIA_BRIDGE_HQ'}</h1>
                  <span className="bg-accent-green/10 text-accent-green text-[10px] font-bold px-2 py-0.5 rounded border border-accent-green/20 uppercase">
                    TINYFISH_VERIFIED ✓
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {stats.tradingName && stats.companyName && stats.tradingName !== stats.companyName && (
                    <span className="text-muted text-xs">({stats.companyName})</span>
                  )}
                  <p className="text-muted text-xs tracking-widest uppercase">Enterprise Compliance Control</p>
                </div>
              </div>
            </div>

            {/* Reputation Score Display */}
            <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${repColor} ml-0 md:ml-4`}>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest opacity-80 font-bold mb-1">Reputation Score</span>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-black leading-none font-mono">{repScore}</span>
                  <span className="text-xs font-bold leading-relaxed">/ 100</span>
                </div>
              </div>
              <div className="w-[1px] h-8 bg-current opacity-20 mx-2" />
              <div className="flex flex-col items-center justify-center min-w-[100px]">
                <span className="text-xs font-black uppercase tracking-wider">{repLabel}</span>
                <div className="w-full bg-bg h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className={`h-full ${repBarColor} transition-all duration-1000`} style={{ width: `${repScore}%` }} />
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-card border border-border px-6 py-3 rounded-xl flex items-center gap-6">
              <div className="text-center">
                <div className="text-[10px] text-muted uppercase font-mono">Matched</div>
                <div className="text-xl font-black font-mono">{stats.totalMatched}</div>
              </div>
              <div className="w-[1px] h-8 bg-border" />
              <div className="text-center">
                <div className="text-[10px] text-muted uppercase font-mono">GTS_Eligible</div>
                <div className="text-xl font-black font-mono text-accent-amber">{stats.gtsEligible}</div>
              </div>
              <div className="w-[1px] h-8 bg-border" />
              <div className="text-center">
                <div className="text-[10px] text-muted uppercase font-mono">System_Health</div>
                <div className="text-xl font-black font-mono text-accent-green">100%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Tab Switcher */}
        <div className="flex gap-1 bg-card/50 p-1 rounded-xl border border-border mb-8 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-6 py-3 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-accent-blue text-bg shadow-[0_5px_15px_rgba(77,166,255,0.3)]' 
                  : 'text-muted hover:text-white hover:bg-surface'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'workers' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workers.map((w) => (
                <div key={w._id} className="bg-card border border-border rounded-2xl p-6 hover:border-accent-blue transition-colors group">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-bold group-hover:text-accent-blue transition-colors">{w.name}</h3>
                      <div className="text-xs text-muted font-mono">{w.location} · {w.country} {countryFlags[w.country] || '🌍'}</div>
                    </div>
                    <div className={`text-2xl font-black font-mono ${
                      w.matchScore > 70 ? 'text-accent-green' : 'text-accent-amber'
                    }`}>
                      {w.matchScore}%
                    </div>
                  </div>
                  <div className="flex gap-2 mb-6">
                    <span className="bg-surface border border-border px-2 py-1 rounded text-[10px] font-mono">NOC_{w.nocCode}</span>
                    <span className={`border px-2 py-1 rounded text-[10px] font-mono ${
                      w.status === 'Optimal' ? 'bg-accent-green/10 border-accent-green/30 text-accent-green' :
                      w.status === 'Viable' ? 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue' :
                      'bg-red-400/10 border-red-400/30 text-red-100'
                    }`}>
                      {w.status.toUpperCase()}
                    </span>
                  </div>
                  <button 
                    onClick={() => setSelectedWorker(w)}
                    className="w-full bg-surface hover:bg-border border border-border py-3 rounded-lg text-xs font-bold transition-all uppercase tracking-widest text-primary"
                  >
                    View Comprehensive Analysis
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'compliance' && (
            <LMIAComplianceTab onGoToWorkers={() => setActiveTab('workers')} />
          )}

          {activeTab === 'transition' && (
            <div className="bg-card border border-border rounded-2xl p-10 font-mono text-sm leading-relaxed max-w-4xl mx-auto shadow-2xl relative overflow-hidden">

              <h2 className="text-2xl font-bold text-accent-blue mb-8 border-b border-border pb-4 uppercase tracking-tighter">Strategic Recruitment & Training Plan — {stats.companyName || 'Employer'}</h2>
              
              <div className="space-y-8 text-primary/80">
                <section>
                  <h4 className="text-accent-green font-bold mb-2 underline tracking-widest">YEAR 1: FOUNDATION</h4>
                  <p>Onboard {workers[0]?.name || 'the foreign worker'} as {stats.jobTitle || 'Software Developer'} at {stats.companyName || 'the company'}. Establish knowledge transfer protocols between {workers[0]?.name || 'the hire'} and existing Canadian development team. Post 1 junior {stats.jobTitle || 'developer'} role exclusively on Canadian job boards (Job Bank, LinkedIn Canada, Indeed Canada). Target universities in Ontario with co-op programs for {stats.jobTitle || 'the role'} (NOC {stats.nocCode || '21232'}).</p>
                </section>
                <section>
                  <h4 className="text-accent-green font-bold mb-2 underline tracking-widest">YEAR 2: SCALE</h4>
                  <p>Hire minimum 1 Canadian junior {stats.jobTitle || 'developer'} to work alongside {workers[0]?.name || 'the foreign worker'}. {workers[0]?.name || 'The hire'} leads technical mentorship program for new Canadian staff. Expand {stats.companyName || 'company'} Canadian recruitment to university co-op programs at University of Toronto, University of Waterloo, and McMaster University. Standardize training protocols for {stats.jobTitle || 'the role'} to facilitate rapid knowledge transfer.</p>
                </section>
                <section>
                  <h4 className="text-accent-green font-bold mb-2 underline tracking-widest">YEAR 3: SUSTAINABILITY</h4>
                  <p>Target 70% Canadian workforce in {stats.companyName || 'the company'} development team. {workers[0]?.name || 'The foreign worker'} eligible for Canadian Experience Class permanent residence application after 12 months of Canadian work experience. Evaluate permanent retention strategy. Establish {stats.companyName || 'the company'} as a top employer for new CS graduates, reducing LMIA dependency by 40%.</p>
                </section>
                <section>
                  <h4 className="text-accent-green font-bold mb-2 underline tracking-widest">CANADIAN HIRING COMMITMENT</h4>
                  <p>{stats.companyName || 'The employer'} commits to prioritizing Canadian citizens and permanent residents for all future {stats.jobTitle || 'Software Developer'} positions as Canadian talent becomes available. Target: hire 2 local junior developers for every 1 LMIA-approved senior role within the first 24 months of approval.</p>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4">
              {/* TinyFish branding badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-accent-blue/10 border border-accent-blue/30 rounded-lg px-4 py-2 flex items-center gap-2">
                    <span className="text-lg">🐟</span>
                    <span className="text-xs font-bold text-accent-blue uppercase tracking-wider">Powered by TinyFish Web Agents</span>
                  </div>
                </div>
                <p className="text-xs text-muted italic font-mono">All agent runs are logged for ESDC audit purposes.</p>
              </div>

              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="bg-surface text-muted uppercase tracking-widest">
                      <th className="px-6 py-4">Agent</th>
                      <th className="px-6 py-4">Action</th>
                      <th className="px-6 py-4">Timestamp</th>
                      <th className="px-6 py-4">Run ID</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {agentRuns.length > 0 ? agentRuns.map((run) => (
                      <tr key={run.runId} className="hover:bg-surface/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-primary">{run.agent}</td>
                        <td className="px-6 py-4 text-muted">
                          {run.agent === 'JOB_SCAN' ? `Job Bank NOC ${stats.nocCode || '21232'} ON` :
                           run.agent === 'VERIFY_EMPLOYER' ? 'Canada Business Registry' :
                           run.agent === 'WAGE_LOOKUP' ? `ESDC Wage Data NOC ${stats.nocCode || '21232'}` :
                           run.agent === 'COMPLIANCE_GEN' ? 'ESDC Employer Compliance' :
                           'Agent task'}
                        </td>
                        <td className="px-6 py-4 text-muted">{run.timestamp}</td>
                        <td className="px-6 py-4 text-accent-blue font-mono">{run.runId}</td>
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              run.status === 'COMPLETE' ? 'bg-accent-green' :
                              run.status === 'RUNNING' ? 'bg-accent-amber animate-pulse' :
                              'bg-red-400'
                            }`} />
                            <span className={`text-xs font-bold ${
                              run.status === 'COMPLETE' ? 'text-accent-green' :
                              run.status === 'RUNNING' ? 'text-accent-amber' :
                              'text-red-400'
                            }`}>
                              {run.status === 'COMPLETE' ? '✓ Complete' : run.status}
                            </span>
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-muted italic">
                          No agent runs recorded yet. Runs will appear after wage lookup and employer verification.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Comprehensive Analysis Modal */}
        {selectedWorker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedWorker(null)}>
            <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="p-6 border-b border-border">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-primary">{selectedWorker.name}</h2>
                    {(selectedWorker.currentJobTitle || selectedWorker.currentEmployer) && (
                      <p className="text-sm text-muted mt-1">
                        {selectedWorker.currentJobTitle}{selectedWorker.currentEmployer ? ` at ${selectedWorker.currentEmployer}` : ''}
                      </p>
                    )}
                    <p className="text-xs text-muted font-mono mt-2">
                      {countryFlags[selectedWorker.country] || '🌍'} {selectedWorker.country} · {selectedWorker.location}
                      {selectedWorker.institutionName ? ` · ${selectedWorker.institutionName}` : ''}
                      {selectedWorker.educationLevel ? ` · ${selectedWorker.educationLevel}` : ''}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      CLB <span className="text-primary font-bold">{selectedWorker.languageScore || 'N/A'}</span>
                      {selectedWorker.yearsExperience ? <> · <span className="text-primary font-bold">{selectedWorker.yearsExperience} years</span> exp</> : null}
                      {selectedWorker.salaryExpectation ? <> · <span className="text-primary font-bold">${selectedWorker.salaryExpectation.toLocaleString()}/yr</span> expected</> : null}
                    </p>
                  </div>
                  <button onClick={() => setSelectedWorker(null)} className="text-muted hover:text-primary text-2xl leading-none">&times;</button>
                </div>
                {selectedWorker.technicalSkills && selectedWorker.technicalSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {selectedWorker.technicalSkills.map((skill, i) => (
                      <span key={i} className="bg-accent-blue/10 border border-accent-blue/30 text-accent-blue text-[10px] font-mono px-2 py-0.5 rounded-md">{skill}</span>
                    ))}
                  </div>
                )}
                {selectedWorker.professionalSummary && (
                  <div className="mt-3 bg-surface/50 border border-border/50 rounded-lg px-4 py-3">
                    <p className="text-xs text-muted italic leading-relaxed">"{selectedWorker.professionalSummary}"</p>
                  </div>
                )}
              </div>

              {/* Match Score Dimensions */}
              <div className="p-6 border-b border-border">
                <h3 className="text-xs font-mono text-muted uppercase tracking-wider mb-4">Match Score Dimensions</h3>
                {selectedWorker.matchDetails ? (
                  <div className="space-y-3">
                    {[
                      { label: 'NOC Alignment', value: selectedWorker.matchDetails.nocAlignment, color: 'bg-accent-green' },
                      { label: 'Wage Compliance', value: selectedWorker.matchDetails.wageCompliance, color: 'bg-accent-blue' },
                      { label: 'Region Match', value: selectedWorker.matchDetails.regionMatch, color: 'bg-accent-green' },
                      { label: 'Language Score', value: selectedWorker.matchDetails.languageScore, color: 'bg-accent-amber' },
                      { label: 'Education Match', value: selectedWorker.matchDetails.educationMatch, color: 'bg-accent-blue' },
                    ].map((dim) => (
                      <div key={dim.label} className="flex items-center gap-3">
                        <span className="text-xs text-muted w-32 text-right font-mono">{dim.label}</span>
                        <div className="flex-1 h-3 bg-surface rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${dim.color} rounded-full transition-all duration-1000`} 
                            style={{ width: `${dim.value}%` }} 
                          />
                        </div>
                        <span className="text-sm font-black font-mono w-12 text-right">{dim.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted italic">Match details not available</p>
                )}

                {/* Total Score */}
                <div className="mt-6 flex items-center justify-between bg-surface rounded-xl p-4 border border-border">
                  <span className="text-sm font-mono text-muted uppercase tracking-wider">Total Match Score</span>
                  <span className={`text-4xl font-black font-mono ${
                    selectedWorker.matchScore >= 80 ? 'text-accent-green' : 'text-accent-amber'
                  }`}>
                    {selectedWorker.matchScore}<span className="text-lg text-muted">/100</span>
                  </span>
                </div>

                {/* Score Legend + LMIA Viable Badge */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[10px] font-mono text-muted">
                    <span><span className="inline-block w-2 h-2 rounded-sm bg-accent-green mr-1" />80-100 Excellent</span>
                    <span><span className="inline-block w-2 h-2 rounded-sm bg-accent-amber mr-1" />65-79 Good</span>
                    <span><span className="inline-block w-2 h-2 rounded-sm bg-red-400 mr-1" />Below 65 Review</span>
                  </div>
                  {selectedWorker.matchDetails && (
                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${
                      selectedWorker.matchDetails.lmiaViable
                        ? 'bg-accent-green/10 text-accent-green border border-accent-green/30'
                        : 'bg-red-400/10 text-red-400 border border-red-400/30'
                    }`}>
                      {selectedWorker.matchDetails.lmiaViable ? 'LMIA VIABLE' : 'LMIA REVIEW NEEDED'}
                    </span>
                  )}
                </div>
              </div>

              {/* GTS Pathway Selection */}
              {selectedWorker.gtsEligible && (
                <div className="px-6 py-4 border-b border-border">
                  <div className="bg-accent-amber/10 border border-accent-amber/30 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">⚡</span>
                      <div>
                        <p className="text-sm font-bold text-accent-amber">GTS FAST TRACK ELIGIBLE — Category B</p>
                        <p className="text-xs text-accent-amber/80 mt-0.5">14-Day Processing</p>
                      </div>
                    </div>

                    {(selectedWorker.lmiaPathway || lmiaPathway) ? (
                      <div className={`p-4 rounded-lg border-2 ${
                        (selectedWorker.lmiaPathway || lmiaPathway) === 'gts'
                          ? 'border-accent-green/40 bg-accent-green/10'
                          : 'border-border bg-surface'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-primary">
                              {(selectedWorker.lmiaPathway || lmiaPathway) === 'gts' 
                                ? '✓ Global Talent Stream selected' 
                                : '✓ Standard LMIA Stream selected'}
                            </p>
                            <p className="text-xs text-muted mt-1">
                              {(selectedWorker.lmiaPathway || lmiaPathway) === 'gts'
                                ? 'This application will use GTS Category B 14-day processing. No advertising required.'
                                : 'This application will use standard LMIA processing with full 4-week advertising.'}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setLmiaPathway(null);
                              setSelectedWorker(prev => prev ? { ...prev, lmiaPathway: null } : null);
                              setWorkers(prev => prev.map(w => 
                                w._id === selectedWorker._id ? { ...w, lmiaPathway: null } : w
                              ));
                            }}
                            className="text-xs text-muted hover:text-primary underline ml-4 whitespace-nowrap"
                          >
                            Change
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-muted mb-4">Two pathway options for this candidate:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                          <div className="border-2 border-accent-green/30 bg-accent-green/5 rounded-lg p-4">
                            <p className="text-sm font-bold text-accent-green mb-2">OPTION A — Global Talent Stream</p>
                            <p className="text-[10px] text-accent-green/80 uppercase tracking-wider mb-2">Recommended</p>
                            <ul className="space-y-1 text-xs">
                              <li className="text-accent-green">✓ 14-day LMIA processing</li>
                              <li className="text-accent-green">✓ No 4-week advertising requirement</li>
                              <li className="text-accent-green">✓ Streamlined documentation</li>
                              <li className="text-red-400">✗ Must commit to GTS program</li>
                              <li className="text-red-400">✗ Must pay GTS employer fee</li>
                            </ul>
                          </div>
                          <div className="border border-border bg-surface rounded-lg p-4">
                            <p className="text-sm font-bold text-primary mb-2">OPTION B — Standard LMIA Stream</p>
                            <p className="text-[10px] text-muted uppercase tracking-wider mb-2">&nbsp;</p>
                            <ul className="space-y-1 text-xs">
                              <li className="text-accent-green">✓ Lower fees</li>
                              <li className="text-red-400">✗ 3-6 month processing time</li>
                              <li className="text-red-400">✗ Full 4-week advertising required</li>
                              <li className="text-red-400">✗ 3 platforms minimum</li>
                            </ul>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button
                            disabled={pathwayLoading}
                            onClick={() => handleSelectPathway('gts')}
                            className="flex-1 bg-accent-green hover:bg-green-500 text-bg font-bold py-3 rounded-lg text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
                          >
                            {pathwayLoading ? 'Saving...' : 'Select GTS Pathway'}
                          </button>
                          <button
                            disabled={pathwayLoading}
                            onClick={() => handleSelectPathway('standard')}
                            className="flex-1 bg-surface hover:bg-border border border-border text-primary font-bold py-3 rounded-lg text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
                          >
                            {pathwayLoading ? 'Saving...' : 'Use Standard LMIA'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Summary */}
              {(selectedWorker.summary || selectedWorker.matchDetails?.summary) && (
                <div className="px-6 py-4 border-b border-border">
                  <h3 className="text-xs font-mono text-muted uppercase tracking-wider mb-2">AI Assessment Summary</h3>
                  <p className="text-sm text-primary/80 leading-relaxed">
                    {selectedWorker.summary || selectedWorker.matchDetails?.summary}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="p-6 flex gap-3">
                <button 
                  onClick={() => {
                    alert('LMIA package generation will be triggered via POST /api/compliance/generate');
                  }}
                  className="flex-1 bg-accent-green hover:bg-green-500 text-bg font-bold py-3 rounded-lg text-sm uppercase tracking-widest transition-colors"
                >
                  Generate LMIA Package
                </button>
                <button 
                  onClick={() => {
                    alert('Interview invitation feature coming soon');
                  }}
                  className="flex-1 bg-surface hover:bg-border border border-border text-primary font-bold py-3 rounded-lg text-sm uppercase tracking-widest transition-colors"
                >
                  Send Interview Invitation
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EmployerDashboard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}

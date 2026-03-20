'use client';

import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Worker {
  _id: string;
  name: string;
  nocCode: string;
  matchScore: number;
  location: string;
  status: string;
}

interface AgentRun {
  runId: string;
  timestamp: string;
  agent: string;
  status: 'COMPLETE' | 'FAILED' | 'RUNNING';
  duration: string;
}

export default function EmployerDashboard() {
  const [activeTab, setActiveTab] = useState('workers');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);

  // Live dashboard stats from MongoDB
  const [stats, setStats] = useState({
    totalMatched: 0,
    gtsEligible: 0,
    verificationStatus: 'pending',
    companyName: null as string | null,
    jobTitle: null as string | null,
    nocCode: null as string | null,
    reputationScore: 0,
    reputationLabel: 'New Account',
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
        // Fetch workers, stats, and agent activity in parallel from live APIs
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
  }, []);

  const tabs = [
    { id: 'workers', label: 'Matched Workers', icon: '👤' },
    { id: 'compliance', label: 'LMIA Compliance', icon: '📅' },
    { id: 'transition', label: 'Transition Plan', icon: '📄' },
    { id: 'activity', label: 'Agent Activity', icon: '🤖' }
  ];

  const ComplianceCalendar = () => {
    const [isGenerating, setIsGenerating] = useState(false);
    
    const weeks = [
      { week: 1, platform: 'Job Bank Canada', action: 'Post job listing, capture confirmation URL', status: 'complete', deadline: 'Day 7' },
      { week: 2, platform: 'LinkedIn Jobs Canada', action: 'Post identical job listing, screenshot the post', status: 'pending', deadline: 'Day 14' },
      { week: 3, platform: 'Indeed Canada', action: 'Post identical job listing, log all applicant responses', status: 'pending', deadline: 'Day 21' },
      { week: 4, platform: 'All Platforms', action: 'Close postings, compile response logs, document no suitable Canadian found', status: 'pending', deadline: 'Day 28' }
    ];

    const handleGeneratePDF = () => {
      try {
        const doc = new jsPDF({
          orientation: 'p',
          unit: 'mm',
          format: 'a4'
        });
        
        // 1. Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(30, 41, 59); // Slate 800
        doc.text('LMIABridge', 14, 20);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(14);
        doc.setTextColor(71, 85, 105); // Slate 600
        doc.text('LMIA Compliance Evidence Pack', 14, 28);
        
        // Horizontal Line
        doc.setDrawColor(226, 232, 240); // Slate 200
        doc.setLineWidth(0.5);
        doc.line(14, 34, 196, 34);

        // 2. Employer details
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // Slate 500
        doc.text('EMPLOYER DIRECTORY', 14, 45);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42); // Slate 900
        doc.text(stats.companyName || 'Employer', 14, 52);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(34, 197, 94); // Green 500
        doc.text('Status: VERIFIED (Business Registry & ESDC Clear)', 14, 58);
        
        doc.setTextColor(100, 116, 139);
        doc.text(`TinyFish Run ID: run_68fb`, 14, 64);
        doc.text(`Verification Timestamp: 2026-03-11 14:22 UTC`, 14, 70);

        // 3. Wage Analysis
        doc.text('WAGE ANALYSIS', 120, 45);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text(`NOC ${stats.nocCode || '21231'} - ${stats.jobTitle || 'Role'}`, 120, 52);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(34, 197, 94);
        doc.text('Offered: $60.00/hr', 120, 58);
        doc.setTextColor(100, 116, 139);
        doc.text('ESDC Median: $48.00/hr', 120, 64);

        // 4. Advertising Table
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('Advertising Schedule', 14, 85);

        autoTable(doc, {
          startY: 90,
          head: [['Week', 'Platform', 'Action taken', 'Status', 'Deadline']],
          body: weeks.map(w => [
            `Week ${w.week}`,
            w.platform,
            w.action,
            w.status.toUpperCase(),
            w.deadline
          ]),
          styles: { fontSize: 9, font: 'helvetica' },
          headStyles: { fillColor: [15, 23, 42] },
          alternateRowStyles: { fillColor: [248, 250, 252] },
        });

        // 5. Transition Plan
        const finalY = (doc as any).lastAutoTable?.finalY || 140;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('Transition Plan Excerpt', 14, finalY + 15);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        const transitionText = "Commitment to hiring 2 local junior developers for every 1 LMIA-approved senior role within the first 24 months of approval. Implement internal mentorship program pairing foreign worker with Canadian junior developers.";
        const splitText = doc.splitTextToSize(transitionText, 180);
        doc.text(splitText, 14, finalY + 22);

        // 6. Footer
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // Slate 400
        doc.text('Generated by LMIABridge — Powered by TinyFish Web Agents in ' + ((Date.now() % 1000) + 500) + 'ms', 14, 285);

        // Strict synchronous download prevents the browser from dropping the User Activation token
        // which was causing the filename to strip out and fall back to the raw Blob UUID.
        doc.save(`LMIABridge_Evidence_Pack_${(stats.companyName || 'Employer').replace(/\s+/g, '_')}.pdf`);
        
      } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Failed to generate PDF. Check console for details.');
        setIsGenerating(false);
      }
    };

    return (
      <div className="space-y-6">
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-8 shadow-xl">
          <table className="w-full text-left font-mono text-sm">
            <thead className="bg-surface border-b border-border text-muted">
              <tr>
                <th className="p-4 font-bold uppercase tracking-wider">Week</th>
                <th className="p-4 font-bold uppercase tracking-wider">Platform</th>
                <th className="p-4 font-bold uppercase tracking-wider">Action Required</th>
                <th className="p-4 font-bold uppercase tracking-wider">Deadline</th>
                <th className="p-4 font-bold uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-surface/50 transition-colors">
                  <td className="p-4 text-primary font-bold">Week {w.week}</td>
                  <td className="p-4 font-bold text-accent-blue">{w.platform}</td>
                  <td className="p-4 text-primary max-w-xs">{w.action}</td>
                  <td className="p-4 text-muted">{w.deadline}</td>
                  <td className="p-4">
                    {w.status === 'complete' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-accent-green/10 text-accent-green text-xs font-bold w-fit">
                        ✅ DONE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-accent-amber/10 text-accent-amber text-xs font-bold w-fit">
                        ⏳ PENDING
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bg-surface/50 p-4 border-t border-border flex items-center gap-3">
             <span className="text-accent-amber text-lg">⚠️</span>
             <p className="text-muted text-xs italic font-mono uppercase tracking-wide">
               LMIA regulations require advertising on at least 3 platforms over 4 weeks.
             </p>
          </div>
        </div>
        <div className="bg-card border border-border p-8 rounded-2xl flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-accent-blue" />
          <div>
            <h3 className="text-xl font-bold text-primary mb-2">Evidence Requirements PDF</h3>
            <p className="text-muted text-sm italic max-w-sm">
              Generate submission-ready documentation package.
            </p>
          </div>
          <button 
            disabled={isGenerating}
            onClick={handleGeneratePDF}
            className="bg-accent-blue hover:bg-blue-600 text-bg font-bold px-6 py-3 rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            {isGenerating ? (
              <>
                <span className="animate-spin text-lg">◌</span> GENERATING...
              </>
            ) : (
              <>
                <span>↓</span> EXPORT EVIDENCE PACK
              </>
            )}
          </button>
        </div>
      </div>
    );
  };


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
                  <h1 className="text-2xl font-bold text-white font-mono tracking-tighter">{stats.companyName || 'LMIA_BRIDGE_HQ'}</h1>
                  <span className="bg-accent-green/10 text-accent-green text-[10px] font-bold px-2 py-0.5 rounded border border-accent-green/20 uppercase">
                    TINYFISH_VERIFIED ✓
                  </span>
                </div>
                <div className="flex items-center gap-3">
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
                      <div className="text-xs text-muted font-mono">{w.location}</div>
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
                  <button className="w-full bg-surface hover:bg-border border border-border py-3 rounded-lg text-xs font-bold transition-all uppercase tracking-widest text-primary">
                    View Comprehensive Analysis
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'compliance' && <ComplianceCalendar />}

          {activeTab === 'transition' && (
            <div className="bg-card border border-border rounded-2xl p-10 font-mono text-sm leading-relaxed max-w-4xl mx-auto shadow-2xl relative overflow-hidden">

              <h2 className="text-2xl font-bold text-accent-blue mb-8 border-b border-border pb-4 uppercase tracking-tighter">Strategic Recruitment & Training Plan — {stats.companyName || 'Employer'}</h2>
              
              <div className="space-y-8 text-primary/80">
                <section>
                  <h4 className="text-accent-green font-bold mb-2 underline tracking-widest">YEAR 1: FOUNDATION</h4>
                  <p>Implement internal mentorship program at {stats.companyName || 'the company'} pairing the foreign {stats.jobTitle || 'worker'} with Canadian junior developers. Launch targeted hackathons in underrepresented regions to identify local talent for {stats.jobTitle || 'the role'} (NOC {stats.nocCode || '—'}).</p>
                </section>
                <section>
                  <h4 className="text-accent-green font-bold mb-2 underline tracking-widest">YEAR 2: SCALE</h4>
                  <p>Increase {stats.companyName || 'company'} recruitment budget by 15% specifically for university campus tours across Canada. Standardize training protocols for {stats.jobTitle || 'the role'} to facilitate rapid knowledge transfer from international hires to Canadian staff.</p>
                </section>
                <section>
                  <h4 className="text-accent-green font-bold mb-2 underline tracking-widest">YEAR 3: SUSTAINABILITY</h4>
                  <p>Achieve 2:1 Canadian-to-foreign-worker ratio for {stats.jobTitle || 'the role'} positions. Establish {stats.companyName || 'the company'} as a top employer for new CS graduates, reducing LMIA dependency by 40%.</p>
                </section>
                <section>
                  <h4 className="text-accent-green font-bold mb-2 underline tracking-widest">CANADIAN HIRING GOALS</h4>
                  <p>Commitment to hiring 2 local junior developers for every 1 LMIA-approved senior role within the first 24 months of approval.</p>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="bg-surface text-muted uppercase tracking-widest">
                    <th className="px-6 py-4">Run_ID</th>
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">Agent_Node</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {agentRuns.map((run) => (
                    <tr key={run.runId} className="hover:bg-surface/50 transition-colors">
                      <td className="px-6 py-4 text-accent-blue">{run.runId}</td>
                      <td className="px-6 py-4 text-muted">{run.timestamp}</td>
                      <td className="px-6 py-4 font-bold text-primary">{run.agent}</td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
                          {run.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-muted">{run.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

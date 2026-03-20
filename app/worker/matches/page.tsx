'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface MatchDetail {
  nocAlignment: number;
  wageCompliance: number;
  regionMatch: number;
  languageScore: number;
  educationMatch: number;
  totalScore: number;
  summary: string;
  lmiaViable: boolean;
}

interface JobMatch {
  _id: string;
  jobTitle: string;
  employerName: string;
  location: string;
  wage: number;
  medianWage: number;
  matchDetails: MatchDetail;
  gtsEligible: boolean;
}

function MatchResultsContent() {
  const searchParams = useSearchParams();
  const noc = searchParams.get('noc');
  const province = searchParams.get('province');
  const workerId = searchParams.get('workerId');
  
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPack, setGeneratingPack] = useState<string | null>(null);
  const [packError, setPackError] = useState<string | null>(null);
  const [compliancePackages, setCompliancePackages] = useState<Record<string, any>>({});
  const [copied, setCopied] = useState(false);

  const profileUrl = workerId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/worker/profile/${workerId}` : null;

  const copyProfileUrl = () => {
    if (profileUrl) {
      navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/matches');
        if (res.ok) {
          const data = await res.json();
          setMatches(data);
        }
      } catch (e) {
        console.error('Failed to fetch matches', e);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [noc, province]);

  const handleGeneratePack = async (lmiaApplicationId: string) => {
    setGeneratingPack(lmiaApplicationId);
    setPackError(null);

    try {
      const res = await fetch('/api/compliance/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lmiaApplicationId })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate compliance package');
      }
      
      setCompliancePackages(prev => ({
        ...prev,
        [lmiaApplicationId]: data.compliancePack
      }));
    } catch (error: any) {
      setPackError(error.message);
    } finally {
      setGeneratingPack(null);
    }
  };

  // Animated score bar component
  const ScoreBar = ({ label, score, delay }: { label: string, score: number, delay: number }) => {
    const [animatedWidth, setAnimatedWidth] = useState(0);

    useEffect(() => {
      const timer = setTimeout(() => {
        setAnimatedWidth(score);
      }, delay);
      return () => clearTimeout(timer);
    }, [score, delay]);

    return (
      <div className="space-y-1 mb-3">
        <div className="flex justify-between text-[10px] font-mono text-muted uppercase">
          <span>{label}</span>
          <span>{score}/100</span>
        </div>
        <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden border border-border/30">
          <div 
            className="h-full bg-accent-blue transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(77,166,255,0.4)]"
            style={{ width: `${animatedWidth}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <div className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold font-mono tracking-tighter">JOB_MATCH_ENGINE</h1>
          <p className="text-muted text-sm mt-2 uppercase tracking-[0.2em]">Showing live analysis for NOC {noc}</p>
        </div>
        <div className="bg-surface border border-border px-4 py-2 rounded-lg font-mono text-xs text-accent-green">
          LIVE_DATA_FEED_ACTIVE
        </div>
      </div>

      {/* Profile Save Banner */}
      {profileUrl && (
        <div className="mb-8 bg-accent-green/10 border border-accent-green/30 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-accent-green mb-1">Your profile has been saved!</p>
            <p className="text-xs text-muted">Bookmark this link to return: <span className="font-mono text-primary">{profileUrl}</span></p>
          </div>
          <button onClick={copyProfileUrl} className="bg-accent-green hover:bg-green-500 text-bg font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-widest transition-colors whitespace-nowrap ml-4">
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[1, 2].map(i => (
            <div key={i} className="bg-card border border-border rounded-2xl h-[400px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          {matches.map((job) => (
            <div key={job._id} className="group relative bg-card border border-border hover:border-border-highlight rounded-2xl p-8 transition-all hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="mb-6">
                {/* GTS Badge */}
                {job.gtsEligible && (
                  <div className="absolute top-4 right-4 z-20">
                    <Link href={`/gts?noc=${noc || '21231'}&category=B`} className="flex items-center gap-1.5 bg-accent-amber/10 border border-accent-amber/30 px-3 py-1 rounded-full text-[10px] font-bold text-accent-amber uppercase tracking-widest hover:bg-accent-amber/20 hover:scale-105 transition-all cursor-pointer shadow-[0_0_15px_rgba(255,184,0,0.2)]">
                      <span className="text-sm animate-pulse">★</span> GTS FAST TRACK — 14 Days
                    </Link>
                  </div>
                )}
                <h3 className="text-2xl font-bold group-hover:text-accent-blue transition-colors line-clamp-1 mt-6 md:mt-0">{job.jobTitle}</h3>
                <div className="text-muted text-sm font-mono mt-1">{job.employerName}</div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-surface/50 border border-border/30 rounded-lg p-3">
                  <div className="text-[10px] text-muted uppercase font-mono mb-1">Location</div>
                  <div className="text-sm font-bold">{job.location}</div>
                </div>
                <div className="bg-surface/50 border border-border/30 rounded-lg p-3">
                  <div className="text-[10px] text-muted uppercase font-mono mb-1">Offer vs Median</div>
                  <div className={`text-sm font-bold font-mono ${job.wage >= job.medianWage ? 'text-accent-green' : 'text-red-400'}`}>
                    ${job.wage}/hr <span className="text-[10px] opacity-60">(${job.medianWage} median)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-8 bg-surface/30 p-4 rounded-xl border border-border/20">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-bold text-primary">MATCH_ANALYSIS</span>
                  <div className={`text-3xl font-black font-mono ${
                    job.matchDetails.totalScore > 70 ? 'text-accent-green' : 
                    job.matchDetails.totalScore > 40 ? 'text-accent-amber' : 'text-red-400'
                  }`}>
                    {job.matchDetails.totalScore}%
                  </div>
                </div>
                
                <ScoreBar label="NOC Alignment" score={job.matchDetails.nocAlignment} delay={100} />
                <ScoreBar label="Wage Compliance" score={job.matchDetails.wageCompliance} delay={250} />
                <ScoreBar label="Region Match" score={job.matchDetails.regionMatch} delay={400} />
                <ScoreBar label="Language Score" score={job.matchDetails.languageScore} delay={550} />
                <ScoreBar label="Education Match" score={job.matchDetails.educationMatch} delay={700} />
              </div>

              {/* Score Legend + LMIA Viable Badge */}
              <div className="flex items-center justify-between mb-6 px-1">
                <div className="flex items-center gap-3 text-[10px] font-mono text-muted">
                  <span><span className="inline-block w-2 h-2 rounded-sm bg-accent-green mr-1" />80-100 Excellent</span>
                  <span><span className="inline-block w-2 h-2 rounded-sm bg-accent-amber mr-1" />65-79 Good</span>
                  <span><span className="inline-block w-2 h-2 rounded-sm bg-red-400 mr-1" />Below 65 Review</span>
                </div>
                <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${
                  job.matchDetails.lmiaViable 
                    ? 'bg-accent-green/10 text-accent-green border border-accent-green/30' 
                    : 'bg-red-400/10 text-red-400 border border-red-400/30'
                }`}>
                  {job.matchDetails.lmiaViable ? 'LMIA VIABLE' : 'LMIA REVIEW NEEDED'}
                </span>
              </div>

              <div className="relative z-10">
                <button 
                  disabled={!!generatingPack}
                  onClick={() => handleGeneratePack(job._id)}
                  className="w-full bg-accent-blue hover:bg-blue-600 text-bg font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 mb-4"
                >
                  {generatingPack === job._id ? (
                    <>
                      <span className="animate-spin text-lg">◌</span>
                      GENERATING_COMPLIANCE_PACK...
                    </>
                  ) : (
                    <>
                      GENERATE LMIA PACKAGE
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </div>

              {packError && generatingPack === null && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-xs font-mono">
                  ERROR: {packError}
                </div>
              )}

              {compliancePackages[job._id] && (
                <div className="mt-4 p-4 bg-surface/80 border border-accent-green/50 rounded-xl space-y-3 font-mono text-xs text-primary animate-in zoom-in-95">
                  <h4 className="font-bold text-accent-green border-b border-border pb-2 uppercase tracking-widest">Compliance Package Ready</h4>
                  
                  <div>
                    <span className="text-muted block mb-1">GTS Category:</span>
                    <span className="text-accent-amber font-bold p-1 bg-accent-amber/10 rounded">
                      {compliancePackages[job._id].gtsCategory || 'Not Eligible'}
                    </span>
                    {compliancePackages[job._id].gtsCategory && (
                      <span className="text-accent-green ml-2">— Processing: 14 days</span>
                    )}
                  </div>

                  <div>
                    <span className="text-muted block mb-1">Advertising Timeline:</span>
                    <ul className="space-y-1 ml-2 border-l border-border pl-2 text-[10px]">
                      {compliancePackages[job._id].advertisingSchedule?.map((ad: any, i: number) => (
                        <li key={i}>
                          <span className="text-accent-blue">Week {ad.week}:</span> {ad.platform}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {compliancePackages[job._id].wageJustification && (
                    <div>
                      <span className="text-muted block mb-1">Wage Justification:</span>
                      <p className="line-clamp-2 italic text-primary/80">
                        "{compliancePackages[job._id].wageJustification}"
                      </p>
                    </div>
                  )}

                  <div>
                    <span className="text-muted block mb-1">Transition Plan Goal:</span>
                    <p className="line-clamp-2 italic text-primary/80">
                      "{compliancePackages[job._id].transitionPlan?.canadianHiringGoals || 'N/A'}"
                    </p>
                  </div>

                  {compliancePackages[job._id].warningsAndRisks?.length > 0 && (
                    <div>
                      <span className="text-accent-amber block mb-1">⚠ Warnings:</span>
                      <ul className="space-y-1 text-[10px] text-accent-amber/80">
                        {compliancePackages[job._id].warningsAndRisks.map((w: string, i: number) => (
                          <li key={i}>• {w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Summary */}
              {!compliancePackages[job._id] && (
                <p className="mt-4 text-[10px] text-muted font-mono leading-relaxed italic border-t border-border/50 pt-4">
                  AI_SUMMARY: {job.matchDetails.summary}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MatchResults() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto py-12 px-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-8">{[1,2].map(i => <div key={i} className="bg-card border border-border rounded-2xl h-[400px] animate-pulse" />)}</div></div>}>
      <MatchResultsContent />
    </Suspense>
  );
}

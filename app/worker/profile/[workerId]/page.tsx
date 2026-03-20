'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface WorkerProfile {
  _id: string;
  name: string;
  email: string;
  nocCode: string;
  country: string;
  languageScore: string;
  educationLevel: string;
  desiredProvince: string;
  salaryExpectation: number;
  currentJobTitle: string;
  currentEmployer: string;
  yearsExperience: number;
  technicalSkills: string[];
  institutionName: string;
  professionalSummary: string;
  createdAt: string;
}

interface LMIAApp {
  _id: string;
  matchScore: number;
  complianceStatus: string;
  lmiaPathway: string | null;
  lmiaDecision: string | null;
  gtsEligible: boolean;
  createdAt: string;
}

const formatDate = (d: string | null | undefined) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

export default function WorkerProfilePage() {
  const params = useParams();
  const workerId = params.workerId as string;
  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [applications, setApplications] = useState<LMIAApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/workers/profile/${workerId}`);
        if (res.status === 404) { setNotFound(true); setLoading(false); return; }
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        setWorker(data.worker);
        setApplications(data.applications || []);
      } catch (e) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    if (workerId) fetchProfile();
  }, [workerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full" />
        <span className="ml-3 text-muted font-mono text-sm">Loading profile...</span>
      </div>
    );
  }

  if (notFound || !worker) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-2xl font-bold text-primary mb-3">Profile Not Found</h2>
        <p className="text-muted text-sm mb-6">This worker profile does not exist or has been removed.</p>
        <Link href="/worker" className="bg-accent-blue hover:bg-blue-600 text-bg font-bold px-6 py-3 rounded-lg text-sm uppercase tracking-widest transition-colors inline-block">
          Create a New Profile →
        </Link>
      </div>
    );
  }

  // LMIA Status Tracker stages
  const stages = [
    { id: 1, label: 'Match Found' },
    { id: 2, label: 'Pathway Selected' },
    { id: 3, label: 'Application Submitted' },
    { id: 4, label: 'Decision Received' },
    { id: 5, label: 'Work Permit Applied' },
    { id: 6, label: 'Worker Arrived' },
    { id: 7, label: 'PR Clock Started' },
  ];
  const app = applications[0];
  let currentStage = 0;
  if (app) {
    currentStage = 1;
    if (app.lmiaPathway) currentStage = 2;
    if (app.lmiaDecision) currentStage = 4;
    if (app.lmiaDecision === 'positive') currentStage = 5;
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-mono tracking-tighter text-primary">{worker.name}</h1>
        <p className="text-muted text-sm font-mono mt-1">{worker.currentJobTitle} at {worker.currentEmployer} · {worker.country}</p>
      </div>

      {/* Profile Summary */}
      <div className="bg-card border border-border rounded-2xl p-8 mb-6">
        <h2 className="text-xs font-mono text-muted uppercase tracking-wider mb-4">Profile Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div><p className="text-[10px] text-muted uppercase">NOC Code</p><p className="text-sm font-bold font-mono">{worker.nocCode}</p></div>
          <div><p className="text-[10px] text-muted uppercase">Education</p><p className="text-sm font-bold">{worker.educationLevel}</p></div>
          <div><p className="text-[10px] text-muted uppercase">CLB Score</p><p className="text-sm font-bold font-mono">{worker.languageScore}</p></div>
          <div><p className="text-[10px] text-muted uppercase">Experience</p><p className="text-sm font-bold">{worker.yearsExperience} years</p></div>
          <div><p className="text-[10px] text-muted uppercase">Target Province</p><p className="text-sm font-bold">{worker.desiredProvince}</p></div>
          <div><p className="text-[10px] text-muted uppercase">Salary Expectation</p><p className="text-sm font-bold font-mono">${worker.salaryExpectation?.toLocaleString()}/yr</p></div>
          {worker.institutionName && <div><p className="text-[10px] text-muted uppercase">Institution</p><p className="text-sm font-bold">{worker.institutionName}</p></div>}
          <div><p className="text-[10px] text-muted uppercase">Member Since</p><p className="text-sm font-bold">{formatDate(worker.createdAt)}</p></div>
        </div>

        {worker.technicalSkills && worker.technicalSkills.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] text-muted uppercase mb-2">Technical Skills</p>
            <div className="flex flex-wrap gap-2">
              {worker.technicalSkills.map((skill, i) => (
                <span key={i} className="bg-accent-blue/10 border border-accent-blue/30 text-accent-blue text-xs font-mono px-2.5 py-1 rounded-lg">{skill}</span>
              ))}
            </div>
          </div>
        )}

        {worker.professionalSummary && (
          <div>
            <p className="text-[10px] text-muted uppercase mb-2">Professional Summary</p>
            <p className="text-sm text-primary/80 leading-relaxed">{worker.professionalSummary}</p>
          </div>
        )}
      </div>

      {/* Applications */}
      {applications.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-8 mb-6">
          <h2 className="text-xs font-mono text-muted uppercase tracking-wider mb-4">LMIA Applications</h2>
          <div className="space-y-3">
            {applications.map((a) => (
              <div key={a._id} className="flex items-center justify-between bg-surface rounded-lg p-4 border border-border">
                <div>
                  <p className="text-sm font-bold">Match Score: <span className="font-mono text-accent-green">{a.matchScore}/100</span></p>
                  <p className="text-xs text-muted">Pathway: {a.lmiaPathway === 'gts' ? 'GTS Category B' : a.lmiaPathway === 'standard' ? 'Standard LMIA' : 'Not selected'} · Applied: {formatDate(a.createdAt)}</p>
                </div>
                <span className={`px-3 py-1 rounded text-xs font-bold uppercase ${
                  a.complianceStatus === 'viable' ? 'bg-accent-green/10 text-accent-green border border-accent-green/30' :
                  'bg-accent-amber/10 text-accent-amber border border-accent-amber/30'
                }`}>{a.complianceStatus}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LMIA Status Tracker */}
      {app && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-xs font-mono text-muted uppercase tracking-wider mb-6">LMIA Application Progress</h3>
          <div className="flex items-center justify-between relative">
            <div className="absolute top-3 left-6 right-6 h-0.5 bg-border" />
            <div className="absolute top-3 left-6 h-0.5 bg-accent-green transition-all duration-1000" style={{ width: `${Math.max(0, ((currentStage - 1) / 6) * 100)}%`, maxWidth: 'calc(100% - 48px)' }} />
            {stages.map((stage) => {
              const isComplete = stage.id < currentStage;
              const isCurrent = stage.id === currentStage;
              return (
                <div key={stage.id} className="flex flex-col items-center z-10 relative" style={{ width: `${100 / 7}%` }}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                    isComplete ? 'bg-accent-green border-accent-green text-bg' :
                    isCurrent ? 'bg-accent-amber border-accent-amber text-bg animate-pulse' :
                    'bg-bg border-border text-muted'
                  }`}>{isComplete ? '✓' : stage.id}</div>
                  <span className={`text-[9px] font-mono mt-2 text-center leading-tight ${
                    isComplete ? 'text-accent-green' : isCurrent ? 'text-accent-amber' : 'text-muted'
                  }`}>{stage.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

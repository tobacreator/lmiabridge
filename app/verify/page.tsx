'use client';

import React, { useState } from 'react';
import AgentStatusPanel from '@/components/AgentStatusPanel';

interface ComplianceResult {
  isCompliant: boolean;
  onBlacklist: boolean;
  violations: string[];
  runId: string;
}

export default function VerifyPage() {
  const [query, setQuery] = useState('');
  const [agentStatus, setAgentStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [result, setResult] = useState<ComplianceResult | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setAgentStatus('running');
    setResult(null);

    try {
      const response = await fetch('/api/agents/compliance-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: query }),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              
              if (data.error) {
                setAgentStatus('error');
                return;
              }

              if (data.type === 'COMPLETE' && data.resultJson) {
                setResult({
                  isCompliant: data.resultJson.isCompliant,
                  onBlacklist: data.resultJson.onBlacklist,
                  violations: data.resultJson.violations || [],
                  runId: data.run_id || 'run_' + Math.random().toString(36).substring(7),
                });
                setAgentStatus('complete');
              }
            } catch (err) {
              // Parse error on incomplete chunk, ignore
            }
          }
        }
      }
    } catch (error) {
      console.error('Verification error:', error);
      setAgentStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center py-20 px-6">
      <div className="max-w-3xl w-full">
        {/* Header */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 bg-accent-amber/10 text-accent-amber px-4 py-2 rounded-full border border-accent-amber/20 text-xs font-bold font-mono mb-6">
            <span className="w-2 h-2 rounded-full bg-accent-amber animate-pulse" />
            LIVE ESDC DATABASE CHECK
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">
            Free LMIA <span className="text-accent-amber">Fraud Check</span>
          </h1>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Protect yourself from fraudulent job offers. Enter an employer's name or CRA Business Number below to verify their legitimacy against government blacklists and compliance records in real-time.
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-surface border border-border rounded-2xl p-8 mb-12 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent-blue via-accent-amber to-accent-green" />
          
          <form onSubmit={handleVerify} className="flex flex-col gap-6 relative z-10">
            <div>
              <label className="block text-sm font-bold text-primary mb-2">Employer Search Query</label>
              <input
                type="text"
                required
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter employer name or CRA Business Number (e.g., 123456789)"
                className="w-full bg-bg border border-border rounded-xl px-6 py-4 text-white focus:outline-none focus:border-accent-amber focus:ring-1 focus:ring-accent-amber transition-all font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={agentStatus === 'running' || !query.trim()}
              className="w-full bg-white text-bg font-black py-4 rounded-xl text-lg hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed group-hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.2)] flex justify-center items-center gap-2"
            >
              {agentStatus === 'running' ? (
                <>
                  <span className="w-5 h-5 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                  VERIFYING...
                </>
              ) : (
                'VERIFY LMIA LEGITIMACY'
              )}
            </button>
          </form>
        </div>

        {/* Agent Visualization */}
        <div className="mb-12">
          <AgentStatusPanel 
            agentName="ESDC_COMPLIANCE_SPIDER" 
            url={`canada.ca/en/esdc/registry/search?q=${encodeURIComponent(query || 'search')}`}
            status={agentStatus} 
          />
        </div>

        {/* Results */}
        {agentStatus === 'complete' && result && (
          <div className="animate-in zoom-in-95 duration-500">
            {result.isCompliant && !result.onBlacklist ? (
              <div className="bg-accent-green/5 border border-accent-green/30 rounded-2xl p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <svg className="w-32 h-32 text-accent-green" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="w-20 h-20 bg-accent-green/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-accent-green/50">
                  <svg className="w-10 h-10 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-3xl font-black text-accent-green mb-2">VERIFIED EMPLOYER</h2>
                <p className="text-primary text-lg mb-6">No compliance violations or blacklist records found.</p>
                <div className="inline-flex flex-col items-center bg-bg border border-border px-6 py-3 rounded-lg font-mono text-sm">
                  <span className="text-muted text-xs uppercase mb-1">Secure Reference Number</span>
                  <span className="text-white tracking-widest">{result.runId}</span>
                </div>
              </div>
            ) : (
              <div className="bg-red-500/5 border border-red-500/30 rounded-2xl p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <svg className="w-32 h-32 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-red-500/50">
                  <span className="text-4xl font-black text-red-500">!</span>
                </div>
                <h2 className="text-3xl font-black text-red-500 mb-2">FLAGGED ENTITY</h2>
                <p className="text-primary text-lg mb-6">Warning: Potential compliance violations or blacklist matches detected.</p>
                <div className="inline-flex flex-col items-center bg-bg border border-red-500/20 px-6 py-3 rounded-lg font-mono text-sm">
                  <span className="text-muted text-xs uppercase mb-1">Reference Number</span>
                  <span className="text-red-400 tracking-widest">{result.runId}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {agentStatus === 'error' && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-xl text-center font-mono">
            System Error: Connection to validation servers failed. Please try again.
          </div>
        )}
      </div>
    </div>
  );
}

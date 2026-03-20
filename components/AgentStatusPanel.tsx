'use client';

import React from 'react';

interface AgentStatusPanelProps {
  agentName: string;
  url: string;
  status: 'idle' | 'running' | 'complete' | 'error';
  message?: string;
  result?: any;
}

export default function AgentStatusPanel({ agentName, url, status, message, result }: AgentStatusPanelProps) {
  return (
    <div className="relative overflow-hidden bg-card border border-border rounded-xl p-6 shadow-2xl">
      {/* Scanning Line Animation */}
      {status === 'running' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="w-full h-[2px] bg-accent-green/30 shadow-[0_0_15px_rgba(0,255,148,0.5)] animate-scan opacity-50" />
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            status === 'running' ? 'bg-accent-green animate-pulse-slow' : 
            status === 'complete' ? 'bg-accent-green' : 
            status === 'error' ? 'bg-red-500' : 'bg-muted'
          }`} />
          <h3 className="text-lg font-bold tracking-tight text-primary uppercase font-mono">
            {agentName}
          </h3>
        </div>
        <div className="text-[10px] font-mono text-muted bg-surface px-2 py-1 rounded border border-border tracking-widest uppercase">
          Powered by TinyFish AI
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-bg/50 rounded-lg p-4 font-mono text-sm border border-border/50">
          <div className="text-muted mb-1 flex justify-between">
            <span>TARGET_URL</span>
            <span className="text-[10px] opacity-50">v1.4.2</span>
          </div>
          <div className="text-accent-blue truncate">{url}</div>
        </div>

        <div className="min-h-[60px] flex flex-col justify-center">
          {status === 'idle' && (
            <p className="text-muted text-sm italic">Agent ready for deployment...</p>
          )}
          {status === 'running' && (
            <div className="space-y-2">
              <p className="text-accent-green text-sm flex items-center gap-2">
                <span className="animate-spin text-lg">◌</span>
                {message || 'Agent navigating and extracting data...'}
              </p>
              <div className="w-full bg-surface h-1 rounded-full overflow-hidden">
                <div className="bg-accent-green h-full w-2/3 animate-pulse" />
              </div>
            </div>
          )}
          {status === 'complete' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-accent-green font-bold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                EXECUTION COMPLETE
              </div>
              <p className="text-primary text-xs font-mono">{message || 'Data successfully extracted and synchronized.'}</p>
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-start gap-2 text-red-400">
              <svg className="w-5 h-5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-bold">AGENT ERROR</p>
                <p className="text-xs opacity-80">{message || 'Failed to complete automation sequence.'}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-accent-green/30" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-accent-green/30" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-accent-green/30" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-accent-green/30" />
    </div>
  );
}

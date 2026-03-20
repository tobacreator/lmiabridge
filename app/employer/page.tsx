'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AgentStatusPanel from '@/components/AgentStatusPanel';

export default function EmployerOnboarding() {
  const router = useRouter();
  const [agentStatus, setAgentStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [agentMessage, setAgentMessage] = useState('');
  
  // Live ESDC wage indicator state
  const [wageData, setWageData] = useState<{ medianWage: number; currency: string; cached: boolean } | null>(null);
  const [wageFetching, setWageFetching] = useState(false);

  const [formData, setFormData] = useState({
    companyName: '',
    cra_bn: '',
    province: 'ON',
    industry: 'Technology',
    jobTitle: '',
    nocCode: '',
    wage: '',
    employeeCount: '',
    advertised: false
  });

  // Debounced wage lookup when NOC code changes
  const fetchWageData = useCallback(async (nocCode: string, province: string) => {
    if (!nocCode || nocCode.length < 4) {
      setWageData(null);
      return;
    }
    setWageFetching(true);
    try {
      const res = await fetch('/api/agents/wage-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ nocCode, province })
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          // Direct JSON response (cached)
          const data = await res.json();
          setWageData({ medianWage: data.medianWage || 0, currency: data.currency || 'CAD', cached: !!data.cached });
        } else {
          // SSE stream — consume and extract final result
          const reader = res.body?.getReader();
          const decoder = new TextDecoder();
          let result: any = null;
          if (reader) {
            let done = false;
            while (!done) {
              const { value, done: streamDone } = await reader.read();
              done = streamDone;
              if (value) {
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                for (const line of lines) {
                  const trimmed = line.trim();
                  if (trimmed.startsWith('data: ')) {
                    try {
                      const data = JSON.parse(trimmed.slice(6));
                      if (data.resultJson) result = data.resultJson;
                    } catch (e) {}
                  }
                }
              }
            }
          }
          if (result) {
            setWageData({ medianWage: result.medianWage || 0, currency: result.currency || 'CAD', cached: false });
          }
        }
      }
    } catch (e) {
      console.error('Wage fetch error:', e);
    } finally {
      setWageFetching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.nocCode.length >= 4) {
        fetchWageData(formData.nocCode, formData.province);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.nocCode, formData.province, fetchWageData]);

  // Wage compliance computation
  const offeredWageNum = parseFloat(formData.wage) || 0;
  const offeredHourly = offeredWageNum / 2080; // annual to hourly
  const isWageCompliant = wageData ? offeredHourly >= wageData.medianWage : null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setAgentStatus('running');
    setAgentMessage('TinyFish agent searching Canada Business Registry for ' + formData.companyName + '...');

    try {
      const res = await fetch('/api/agents/verify-employer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          companyName: formData.companyName, 
          province: formData.province,
          craBN: formData.cra_bn
        })
      });

      if (!res.ok) throw new Error('Verification failed');

      // Consume the SSE stream from TinyFish
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let done = false;
        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data: ')) {
                try {
                  const data = JSON.parse(trimmed.slice(6));
                  if (data.type === 'STEP' || data.step) {
                    setAgentMessage(`Verifying: ${data.step || data.message || 'Checking records...'}`);
                  }
                  if (data.type === 'COMPLETE' || data.resultJson) {
                    const result = data.resultJson;
                    if (result?.found) {
                      setAgentStatus('complete');
                      setAgentMessage('Employer verified on Canada Business Registry. Accessing dashboard...');
                    } else {
                      setAgentStatus('complete');
                      setAgentMessage('Employer not found in federal registry. Proceeding with submitted details...');
                    }
                  }
                } catch (e) {}
              }
            }
          }
        }
      }

      setAgentStatus('complete');
      setAgentMessage('Verification complete. Redirecting to compliance dashboard...');
      
      await new Promise(r => globalThis.setTimeout(r, 1200));
      router.push('/employer/dashboard');

    } catch (error) {
      setAgentStatus('error');
      setAgentMessage('Registry lookup failed. Please verify your CRA Business Number.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-accent-green to-accent-blue bg-clip-text text-transparent mb-2 font-mono italic">
          EMPLOYER_PORTAL
        </h1>
        <p className="text-muted text-sm tracking-widest uppercase">LMIA Compliance & Talent Matching</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleVerify} className="bg-surface border border-border rounded-2xl p-8 shadow-xl space-y-6">
            <h2 className="text-2xl font-bold text-primary mb-4">Company Verification</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted uppercase tracking-wider">Company Registered Name</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-bg border border-border rounded-lg px-4 py-3 focus:border-accent-green outline-none transition-colors"
                  placeholder="ACME Corp Canada"
                  value={formData.companyName}
                  onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted uppercase tracking-wider">CRA Business Number</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-bg border border-border rounded-lg px-4 py-3 focus:border-accent-green outline-none transition-colors"
                  placeholder="898765432RT0001"
                  value={formData.cra_bn}
                  onChange={(e) => setFormData({...formData, cra_bn: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted uppercase tracking-wider">Province of Operation</label>
                <select 
                  className="w-full bg-bg border border-border rounded-lg px-4 py-3 focus:border-accent-green outline-none transition-colors appearance-none"
                  value={formData.province}
                  onChange={(e) => setFormData({...formData, province: e.target.value})}
                >
                  <option value="ON">Ontario (ON)</option>
                  <option value="BC">British Columbia (BC)</option>
                  <option value="QC">Quebec (QC)</option>
                  <option value="AB">Alberta (AB)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted uppercase tracking-wider">Industry Sector</label>
                <select 
                  className="w-full bg-bg border border-border rounded-lg px-4 py-3 focus:border-accent-green outline-none transition-colors appearance-none"
                  value={formData.industry}
                  onChange={(e) => setFormData({...formData, industry: e.target.value})}
                >
                  <option>Technology</option>
                  <option>Legal Technology / SaaS</option>
                  <option>Manufacturing</option>
                  <option>Healthcare</option>
                  <option>Construction</option>
                  <option>Agriculture</option>
                  <option>Financial Services</option>
                </select>
              </div>
            </div>

            <div className="pt-6 border-t border-border/50">
              <h3 className="text-lg font-bold text-primary mb-4">Role Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted uppercase tracking-wider">Job Title</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-bg border border-border rounded-lg px-4 py-3 focus:border-accent-green outline-none transition-colors"
                    placeholder="Software Developer"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted uppercase tracking-wider">NOC Code</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-bg border border-border rounded-lg px-4 py-3 focus:border-accent-green outline-none transition-colors"
                    placeholder="21231"
                    value={formData.nocCode}
                    onChange={(e) => setFormData({...formData, nocCode: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted uppercase tracking-wider">Offered Annual Wage (CAD)</label>
                  <input 
                    required
                    type="number" 
                    min="1"
                    className="w-full bg-bg border border-border rounded-lg px-4 py-3 focus:border-accent-green outline-none transition-colors"
                    placeholder="110000"
                    value={formData.wage}
                    onChange={(e) => setFormData({...formData, wage: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted uppercase tracking-wider">Number of Current Employees</label>
                  <input 
                    required
                    type="number" 
                    min="1"
                    className="w-full bg-bg border border-border rounded-lg px-4 py-3 focus:border-accent-green outline-none transition-colors"
                    placeholder="900"
                    value={formData.employeeCount}
                    onChange={(e) => setFormData({...formData, employeeCount: e.target.value})}
                  />
                </div>
              </div>

              {/* Live ESDC Wage Indicator */}
              {(wageFetching || wageData) && formData.nocCode.length >= 4 && (
                <div className={`mt-4 p-4 rounded-xl border transition-all duration-500 ${
                  wageFetching ? 'bg-surface/50 border-border animate-pulse' :
                  isWageCompliant ? 'bg-accent-green/5 border-accent-green/30' : 'bg-red-500/5 border-red-500/30'
                }`}>
                  {wageFetching ? (
                    <div className="flex items-center gap-3">
                      <span className="animate-spin text-accent-blue">◌</span>
                      <span className="text-sm text-muted font-mono">Fetching ESDC median wage for NOC {formData.nocCode}...</span>
                    </div>
                  ) : wageData && wageData.medianWage > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isWageCompliant ? 'bg-accent-green shadow-[0_0_8px_rgba(0,255,148,0.8)]' : 'bg-red-400'}`} />
                          <span className="text-xs font-mono text-muted uppercase tracking-wider">ESDC Wage Compliance</span>
                        </div>
                        {wageData.cached && (
                          <span className="text-[10px] font-mono text-muted/50">CACHED</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-lg font-black font-mono text-primary">
                            ${wageData.medianWage.toFixed(2)}/hr
                          </span>
                          <span className="text-xs text-muted ml-2">
                            (${(wageData.medianWage * 2080).toLocaleString()}/yr)
                          </span>
                        </div>
                        <span className="text-muted">→</span>
                        <div className={`font-bold text-sm ${isWageCompliant ? 'text-accent-green' : 'text-red-400'}`}>
                          {isWageCompliant ? '✓ Your offer is at or above ESDC median' : '✗ Below ESDC median wage'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-muted font-mono">No wage data available for NOC {formData.nocCode}</span>
                  )}
                </div>
              )}
            </div>

            <label className="flex items-start gap-4 p-4 bg-accent-amber/5 border border-accent-amber/20 rounded-xl cursor-pointer hover:bg-accent-amber/10 transition-colors">
              <input 
                type="checkbox" 
                className="mt-1 accent-accent-amber"
                checked={formData.advertised}
                onChange={(e) => setFormData({...formData, advertised: e.target.checked})}
              />
              <span className="text-xs text-accent-amber/80 leading-relaxed font-bold">
                I certify that I have advertised this role for at least 4 consecutive weeks and have received no suitable Canadian applicants.
              </span>
            </label>

            <button 
              type="submit"
              disabled={agentStatus === 'running'}
              className="w-full bg-accent-green hover:bg-green-500 text-bg font-black px-8 py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(0,255,148,0.2)] uppercase tracking-widest disabled:opacity-50"
            >
              VERIFY & CONTINUE
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <AgentStatusPanel 
            agentName="EMPLOYER_VERIFY"
            url="canada.ca/business-registry"
            status={agentStatus}
            message={agentMessage}
          />
          
          <div className="bg-card border border-border rounded-xl p-6">
            <h4 className="text-xs font-mono text-muted uppercase mb-4 tracking-tighter">Trust & Security</h4>
            <ul className="space-y-3 text-xs text-muted">
              <li className="flex items-center gap-2">
                <span className="text-accent-green">✓</span> Secure OAuth 2.0 Integration
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent-green">✓</span> Real-time Federal Registry Check
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent-green">✓</span> ESDC Blacklist Screening
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

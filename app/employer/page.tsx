'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AgentStatusPanel from '@/components/AgentStatusPanel';

export default function EmployerOnboarding() {
  const router = useRouter();
  const [agentStatus, setAgentStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [agentMessage, setAgentMessage] = useState('');
  const agentPanelRef = useRef<HTMLDivElement>(null);
  
  // Wage compliance check state
  const [wageCheckStatus, setWageCheckStatus] = useState<'unchecked' | 'loading' | 'compliant' | 'non-compliant'>('unchecked');
  const [wageCheckResult, setWageCheckResult] = useState<any>(null);
  const [runWageCheck, setRunWageCheck] = useState(false);

  const [formData, setFormData] = useState({
    companyName: '',
    cra_bn: '',
    province: 'ON',
    industry: 'Technology',
    jobTitle: '',
    nocCode: '',
    wage: '',
    employeeCount: '',
    advertisingStartDate: new Date().toISOString().split('T')[0]
  });

  // Manual wage check trigger — handles both cached JSON and live SSE
  const handleWageCheck = async () => {
    setWageCheckStatus('loading');
    setWageCheckResult(null);

    try {
      const response = await fetch('/api/agents/wage-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nocCode: formData.nocCode, province: formData.province })
      });

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream')) {
        // SSE stream — read until COMPLETE
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error('No reader available');

        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                if (parsed.type === 'COMPLETE' && parsed.result) {
                  setWageCheckResult(parsed.result);
                  const offeredHourly = parseFloat(formData.wage) / 2080;
                  setWageCheckStatus(
                    (parsed.result.medianWage && offeredHourly >= parsed.result.medianWage)
                      ? 'compliant' : 'non-compliant'
                  );
                  return;
                }
              } catch {}
            }
          }
        }
      } else {
        // Direct JSON response (cached)
        const data = await response.json();

        // Handle both direct and nested formats
        const result = data.result || data;

        if (result.medianWage) {
          setWageCheckResult(result);
          const offeredHourly = parseFloat(formData.wage) / 2080;
          setWageCheckStatus(
            offeredHourly >= result.medianWage ? 'compliant' : 'non-compliant'
          );
        } else {
          throw new Error('No wage data in response');
        }
      }
    } catch (error) {
      console.error('Wage fetch error:', error);
      setWageCheckStatus('unchecked');
      setWageCheckResult(null);
    }
  };

  useEffect(() => {
    if (runWageCheck && wageCheckStatus === 'unchecked') {
      handleWageCheck();
    }
  }, [runWageCheck]);

  // Check if all required fields are filled for wage check
  const canRunWageCheck = formData.companyName.trim() !== '' && 
                          formData.nocCode.length === 5 && 
                          parseFloat(formData.wage) > 0 && 
                          formData.province !== '';

  // Wage compliance computation
  const offeredWageNum = parseFloat(formData.wage) || 0;
  const offeredHourly = offeredWageNum / 2080;

  // Calculate if advertising date is more than 28 days ago
  const advertisingDate = new Date(formData.advertisingStartDate);
  const today = new Date();
  const daysSinceAdvertising = Math.floor((today.getTime() - advertisingDate.getTime()) / (1000 * 60 * 60 * 24));
  const showAdvertisingWarning = daysSinceAdvertising > 28;

  // Calculate min date (6 months ago) and max date (today)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const minDate = sixMonthsAgo.toISOString().split('T')[0];
  const maxDate = new Date().toISOString().split('T')[0];

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setAgentStatus('running');
    setAgentMessage('TinyFish agent searching Canada Business Registry for ' + formData.companyName + '...');
    setTimeout(() => agentPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);

    try {
      const res = await fetch('/api/agents/verify-employer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          companyName: formData.companyName, 
          province: formData.province,
          craBN: formData.cra_bn,
          industry: formData.industry,
          jobTitle: formData.jobTitle,
          nocCode: formData.nocCode,
          offeredWage: parseFloat(formData.wage) || 0,
          employeeCount: parseInt(formData.employeeCount) || 0,
          advertisingStartDate: formData.advertisingStartDate,
          wageCheckResult: wageCheckResult
        })
      });

      if (!res.ok) throw new Error('Verification failed');

      // Consume the SSE stream from TinyFish
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let capturedEmployerId = '';

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
                  if (data.type === 'EMPLOYER_ID' && data.employerId) {
                    capturedEmployerId = data.employerId;
                  }
                  if (data.type === 'STEP' || data.step) {
                    setAgentMessage(`Verifying: ${data.step || data.message || 'Checking records...'}`);
                  }
                  if (data.type === 'COMPLETE' && (data.result || data.resultJson)) {
                    const result = data.result || data.resultJson;
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
      const dashUrl = capturedEmployerId ? `/employer/dashboard?id=${capturedEmployerId}` : '/employer/dashboard';
      router.push(dashUrl);

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
                    placeholder="21232"
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

              {/* Advertising Start Date */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted uppercase tracking-wider">When did you start advertising this role?</label>
                <input 
                  required
                  type="date" 
                  min={minDate}
                  max={maxDate}
                  className="w-full bg-bg border border-border rounded-lg px-4 py-3 focus:border-accent-green outline-none transition-colors"
                  value={formData.advertisingStartDate}
                  onChange={(e) => setFormData({...formData, advertisingStartDate: e.target.value})}
                />
                <p className="text-xs text-muted italic leading-relaxed">
                  If you have already been advertising, enter the date you first posted the role. If starting today, leave as today's date.
                </p>
                {showAdvertisingWarning && (
                  <div className="mt-2 p-3 rounded-lg bg-accent-amber/10 border border-accent-amber/30">
                    <p className="text-xs text-accent-amber font-bold">
                      ⚠️ Your 4-week advertising period may already be complete. LMIABridge will mark completed weeks accordingly.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* STEP 2 — WAGE COMPLIANCE VERIFICATION */}
            {canRunWageCheck && (
              <div className="mt-8 p-6 rounded-xl border-2 border-accent-blue/30 bg-surface/50">
                <h3 className="text-sm font-mono text-accent-blue uppercase tracking-wider mb-4">
                  STEP 2 — WAGE COMPLIANCE VERIFICATION
                </h3>
                
                {wageCheckStatus === 'unchecked' && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted leading-relaxed">
                      Before verifying your company, confirm that your offered wage meets ESDC requirements for this role.
                    </p>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input 
                        type="checkbox"
                        checked={runWageCheck}
                        onChange={(e) => setRunWageCheck(e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-border bg-bg accent-accent-green"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-primary font-medium group-hover:text-accent-green transition-colors">
                          Run live ESDC wage compliance check for NOC {formData.nocCode} in {formData.province}
                        </p>
                        <p className="text-xs text-muted mt-1 italic">
                          This uses a TinyFish web agent to fetch the current ESDC median wage from Job Bank Canada in real time. Takes 20–40 seconds.
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                {wageCheckStatus === 'loading' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-accent-green animate-pulse" />
                      <p className="text-sm text-accent-green font-medium">
                        TinyFish agent navigating Job Bank Canada...
                      </p>
                    </div>
                    <p className="text-sm text-muted pl-6">
                      Fetching median wage for NOC {formData.nocCode} in {formData.province}...
                    </p>
                    <p className="text-xs text-accent-amber pl-6 font-bold">
                      Please wait — do not click Verify & Continue yet
                      <span className="animate-pulse">...</span>
                    </p>
                  </div>
                )}

                {(wageCheckStatus === 'compliant' || wageCheckStatus === 'non-compliant') && wageCheckResult && (
                  <div className={`border-2 rounded-lg p-5 ${
                    wageCheckStatus === 'compliant' 
                      ? 'border-accent-green/40 bg-accent-green/5' 
                      : 'border-red-500/40 bg-red-500/5'
                  }`}>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                      <div>
                        <p className={`text-sm font-bold ${wageCheckStatus === 'compliant' ? 'text-accent-green' : 'text-red-400'}`}>
                          {wageCheckStatus === 'compliant' ? '✓ ESDC Wage Data Retrieved' : '✗ ESDC Wage Data Retrieved'}
                        </p>
                        <p className="text-base font-semibold text-primary mt-1">
                          {wageCheckResult.occupation || 'Occupation'} — {formData.province}
                        </p>
                        <p className="text-xs text-muted mt-1">
                          Source: Job Bank Canada via TinyFish · Run ID: <span className="font-mono">{wageCheckResult.runId || 'N/A'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Wage Range */}
                    {wageCheckResult.wageLow && wageCheckResult.wageHigh && (
                      <div className="mb-4">
                        <p className="text-xs text-muted uppercase tracking-wider mb-2">Wage Range for this Occupation</p>
                        <div className="flex justify-between text-xs text-muted mb-2">
                          <span>Low</span>
                          <span className="font-bold text-primary">Median</span>
                          <span>High</span>
                        </div>
                        <div className="flex justify-between text-sm font-mono font-bold mb-3">
                          <span className="text-muted">${wageCheckResult.wageLow.toFixed(2)}/hr</span>
                          <span className="text-primary">${wageCheckResult.medianWage.toFixed(2)}/hr</span>
                          <span className="text-muted">${wageCheckResult.wageHigh.toFixed(2)}/hr</span>
                        </div>
                        
                        {/* Visual bar */}
                        <div className="relative h-3 bg-border rounded-full mb-2">
                          <div className="absolute inset-0 bg-gradient-to-r from-red-400 via-accent-amber to-accent-green rounded-full opacity-50" />
                          {/* Median marker */}
                          <div 
                            className="absolute top-0 h-3 w-1 bg-white rounded-full"
                            style={{ 
                              left: `${((wageCheckResult.medianWage - wageCheckResult.wageLow) / (wageCheckResult.wageHigh - wageCheckResult.wageLow)) * 100}%` 
                            }}
                          />
                          {/* Offered wage marker */}
                          <div 
                            className="absolute -top-1 w-5 h-5 rounded-full border-3 border-white shadow-lg"
                            style={{ 
                              left: `${Math.min(Math.max(((offeredHourly - wageCheckResult.wageLow) / (wageCheckResult.wageHigh - wageCheckResult.wageLow)) * 100, 0), 95)}%`,
                              backgroundColor: wageCheckStatus === 'compliant' ? '#00ff94' : '#ef4444'
                            }}
                          />
                        </div>
                        <p className="text-xs text-center text-muted">
                          Your offer: <span className="font-bold text-primary">${offeredHourly.toFixed(2)}/hr</span> (${offeredWageNum.toLocaleString()}/yr)
                        </p>
                      </div>
                    )}

                    {/* Compliance Status */}
                    <div className={`p-4 rounded-lg border-2 ${
                      wageCheckStatus === 'compliant'
                        ? 'border-accent-green/30 bg-accent-green/10'
                        : 'border-red-500/30 bg-red-500/10'
                    }`}>
                      {wageCheckStatus === 'compliant' ? (
                        <div>
                          <p className="text-sm font-bold text-accent-green mb-2">
                            ✓ WAGE COMPLIANT
                          </p>
                          <p className="text-sm text-primary leading-relaxed">
                            Your offer of ${offeredHourly.toFixed(2)}/hr meets the ESDC median of ${wageCheckResult.medianWage.toFixed(2)}/hr for {wageCheckResult.occupation} in {formData.province}. LMIA high-wage stream requirement satisfied.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-bold text-red-400 mb-2">
                            ✗ WAGE NON-COMPLIANT
                          </p>
                          <p className="text-sm text-primary leading-relaxed">
                            Your offer of ${offeredHourly.toFixed(2)}/hr is below the ESDC median of ${wageCheckResult.medianWage.toFixed(2)}/hr. You must increase the offered wage before submitting an LMIA application. ESDC will reject this application at current wage level.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Employment Outlook */}
                    {wageCheckResult.outlook && (
                      <div className="mt-4 p-3 rounded-lg bg-surface border border-border">
                        <p className="text-xs text-muted uppercase tracking-wider mb-1">Employment Outlook</p>
                        <p className="text-sm text-primary font-medium">{wageCheckResult.outlook}</p>
                        {wageCheckResult.outlook === 'Limited' && (
                          <p className="text-xs text-muted mt-2 italic">
                            Note: Limited outlook means more Canadian workers are available — stronger advertising evidence will be required.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Agent Status Panel — between wage check and verify button */}
            {agentStatus !== 'idle' && (
              <div ref={agentPanelRef} className="mt-6">
                <AgentStatusPanel 
                  agentName="EMPLOYER_VERIFY"
                  url="canada.ca/business-registry"
                  status={agentStatus}
                  message={agentMessage}
                />
              </div>
            )}

            {/* STEP 3 — COMPANY VERIFICATION */}
            <div className="mt-6">
              <h3 className="text-sm font-mono text-muted uppercase tracking-wider mb-4">
                STEP 3 — COMPANY VERIFICATION
              </h3>
              <button 
                type="submit"
                disabled={
                  agentStatus === 'running' || 
                  wageCheckStatus === 'loading' || 
                  wageCheckStatus === 'non-compliant' ||
                  (canRunWageCheck && wageCheckStatus === 'unchecked')
                }
                className={`w-full font-black px-8 py-4 rounded-xl transition-all uppercase tracking-widest disabled:opacity-50 ${
                  wageCheckStatus === 'non-compliant'
                    ? 'bg-red-500/20 text-red-400 border-2 border-red-500/40 cursor-not-allowed'
                    : wageCheckStatus === 'compliant'
                    ? 'bg-accent-green hover:bg-green-500 text-bg shadow-[0_0_20px_rgba(0,255,148,0.2)]'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                {wageCheckStatus === 'loading' 
                  ? 'WAITING FOR WAGE VERIFICATION...'
                  : wageCheckStatus === 'non-compliant'
                  ? 'CANNOT PROCEED — WAGE BELOW ESDC MEDIAN'
                  : wageCheckStatus === 'compliant'
                  ? 'WAGE VERIFIED ✓ — VERIFY COMPANY'
                  : canRunWageCheck
                  ? 'RUN WAGE CHECK BEFORE CONTINUING'
                  : 'VERIFY & CONTINUE'
                }
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
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

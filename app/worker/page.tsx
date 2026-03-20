'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AgentStatusPanel from '@/components/AgentStatusPanel';

interface NOC {
  code: string;
  title: string;
}

export default function WorkerOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [nocCodes, setNocCodes] = useState<NOC[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNocDropdown, setShowNocDropdown] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    nocCode: '',
    nocTitle: '',
    country: '',
    province: 'ON',
    educationLevel: 'Bachelor\'s',
    languageScore: 7,
    desiredJobTitle: '',
    salaryExpectation: 60000,
    availability: '',
    inCanada: false,
    institutionName: '',
    currentJobTitle: '',
    currentEmployer: '',
    yearsExperience: 0,
    technicalSkills: [] as string[],
    professionalSummary: '',
  });
  const [skillInput, setSkillInput] = useState('');

  const [agentStatus, setAgentStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [agentMessage, setAgentMessage] = useState('');

  useEffect(() => {
    fetch('/data/noc-codes.json')
      .then(res => res.json())
      .then(data => setNocCodes(data));
  }, []);

  const filteredNocs = nocCodes.filter(n => 
    n.code.includes(searchTerm) || n.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleScan = async () => {
    setAgentStatus('running');
    setAgentMessage('TinyFish agent initializing Job Bank connection...');

    try {
      // Call the job-scan agent
      const res = await fetch('/api/agents/job-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nocCode: formData.nocCode, 
          province: formData.province,
          workerInfo: formData
        })
      });

      if (!res.ok) throw new Error('Agent failed to initialize');

      setAgentMessage('Agent scanning Job Bank for live postings matching NOC ' + formData.nocCode + '...');

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
            // Parse SSE events for progress updates
            const lines = chunk.split('\n');
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data: ')) {
                try {
                  const data = JSON.parse(trimmed.slice(6));
                  if (data.type === 'STEP' || data.step) {
                    setAgentMessage(`Agent: ${data.step || data.message || 'Processing...'}`);
                  }
                  if (data.type === 'COMPLETE' || data.resultJson) {
                    setAgentStatus('complete');
                    setAgentMessage('Job scan complete. Redirecting to match results...');
                  }
                } catch (e) {}
              }
            }
          }
        }
      }

      setAgentStatus('complete');
      setAgentMessage('Found matching job postings. Saving your profile...');
      
      // Save worker profile to MongoDB
      let workerId = '';
      try {
        const saveRes = await fetch('/api/workers/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            nocCode: formData.nocCode,
            country: formData.country,
            languageScore: String(formData.languageScore),
            educationLevel: formData.educationLevel,
            desiredProvince: formData.province,
            salaryExpectation: formData.salaryExpectation,
            currentJobTitle: formData.currentJobTitle,
            currentEmployer: formData.currentEmployer,
            yearsExperience: formData.yearsExperience,
            technicalSkills: formData.technicalSkills,
            institutionName: formData.institutionName,
            professionalSummary: formData.professionalSummary,
          })
        });
        if (saveRes.ok) {
          const saveData = await saveRes.json();
          workerId = saveData.workerId;
        }
      } catch (e) {
        console.error('[Worker Save] Error:', e);
      }

      setAgentMessage('Redirecting to match results...');
      await new Promise(r => globalThis.setTimeout(r, 800));
      const params = new URLSearchParams({ noc: formData.nocCode, province: formData.province });
      if (workerId) params.set('workerId', workerId);
      router.push(`/worker/matches?${params.toString()}`);

    } catch (error) {
      setAgentStatus('error');
      setAgentMessage('Communication failure with TinyFish automation cluster.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-muted bg-clip-text text-transparent mb-2 font-mono">
          WORKER_ONBOARDING
        </h1>
        <p className="text-muted text-sm tracking-widest uppercase">Canada Immigration Matching Engine</p>
      </div>

      {/* Progress Bar */}
      <div className="flex justify-between mb-12 relative">
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-border -translate-y-1/2 -z-10" />
        {[1, 2, 3].map((s) => (
          <div 
            key={s}
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all duration-500 ${
              step >= s ? 'bg-accent-blue border-accent-blue text-bg shadow-[0_0_15px_rgba(77,166,255,0.4)]' : 'bg-surface border-border text-muted'
            }`}
          >
            {s}
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-2xl p-8 shadow-xl">
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-primary mb-6">Your Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted uppercase tracking-wider">Full Name</label>
                <input 
                  type="text" 
                  className="w-full bg-bg border border-border rounded-lg px-4 py-3 focus:border-accent-blue outline-none transition-colors"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted uppercase tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  className="w-full bg-bg border border-border rounded-lg px-4 py-3 focus:border-accent-blue outline-none transition-colors"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="space-y-2 relative">
                <label className="text-xs font-mono text-muted uppercase tracking-wider">Target NOC Code</label>
                <input 
                  type="text" 
                  className="w-full bg-bg border border-border rounded-lg px-4 py-3 focus:border-accent-blue outline-none transition-colors"
                  placeholder="Search NOC (e.g. 21232)"
                  value={searchTerm || formData.nocCode}
                  onFocus={() => setShowNocDropdown(true)}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowNocDropdown(true);
                  }}
                />
                {showNocDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-2xl max-h-60 overflow-y-auto">
                    {filteredNocs.map(n => (
                      <div 
                        key={n.code}
                        className="px-4 py-3 hover:bg-surface cursor-pointer border-b border-border/50 last:border-0"
                        onClick={() => {
                          setFormData({...formData, nocCode: n.code, nocTitle: n.title});
                          setSearchTerm(`${n.code} - ${n.title}`);
                          setShowNocDropdown(false);
                        }}
                      >
                        <div className="font-bold text-accent-green">{n.code}</div>
                        <div className="text-xs text-muted">{n.title}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted uppercase tracking-wider">Country of Origin</label>
                <input 
                  type="text" 
                  className="w-full bg-bg border border-border rounded-lg px-4 py-3 focus:border-accent-blue outline-none transition-colors"
                  placeholder="Nigeria"
                  value={formData.country}
                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted uppercase tracking-wider">Education Level</label>
                <select 
                  className="w-full bg-bg border border-border rounded-lg px-4 py-3 focus:border-accent-blue outline-none transition-colors appearance-none"
                  value={formData.educationLevel}
                  onChange={(e) => setFormData({...formData, educationLevel: e.target.value})}
                >
                  <option>High School</option>
                  <option>Diploma</option>
                  <option>Bachelor's</option>
                  <option>Master's</option>
                  <option>PhD</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted uppercase tracking-wider">Institution / University <span className="text-muted/50">(optional)</span></label>
                <input 
                  type="text" 
                  className="w-full bg-bg border border-border rounded-lg px-4 py-3 focus:border-accent-blue outline-none transition-colors"
                  placeholder="University of Lagos"
                  value={formData.institutionName}
                  onChange={(e) => setFormData({...formData, institutionName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted uppercase tracking-wider">Current Job Title <span className="text-red-400">*</span></label>
                <input 
                  type="text" 
                  className="w-full bg-bg border border-border rounded-lg px-4 py-3 focus:border-accent-blue outline-none transition-colors"
                  placeholder="Senior Software Engineer"
                  value={formData.currentJobTitle}
                  onChange={(e) => setFormData({...formData, currentJobTitle: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted uppercase tracking-wider">Current Employer <span className="text-red-400">*</span></label>
                <input 
                  type="text" 
                  className="w-full bg-bg border border-border rounded-lg px-4 py-3 focus:border-accent-blue outline-none transition-colors"
                  placeholder="Andela"
                  value={formData.currentEmployer}
                  onChange={(e) => setFormData({...formData, currentEmployer: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted uppercase tracking-wider">Years of Experience <span className="text-red-400">*</span></label>
                <input 
                  type="number" 
                  min="0"
                  max="50"
                  className="w-full bg-bg border border-border rounded-lg px-4 py-3 focus:border-accent-blue outline-none transition-colors font-mono"
                  placeholder="5"
                  value={formData.yearsExperience || ''}
                  onChange={(e) => setFormData({...formData, yearsExperience: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-4 col-span-2">
                <div className="flex justify-between">
                  <label className="text-xs font-mono text-muted uppercase tracking-wider">Language Proficiency (CLB Score)</label>
                  <span className="text-accent-blue font-mono font-bold">{formData.languageScore} / 12</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="12" 
                  step="1"
                  className="w-full accent-accent-blue"
                  value={formData.languageScore}
                  onChange={(e) => setFormData({...formData, languageScore: parseInt(e.target.value)})}
                />
                <div className="flex justify-between text-[10px] text-muted font-mono">
                  <span>CLB 1 (Basic)</span>
                  <span>CLB 7 (Req.)</span>
                  <span>CLB 12 (Native)</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-8">
              <button 
                onClick={() => {
                  if (!formData.currentJobTitle.trim() || !formData.currentEmployer.trim() || !formData.yearsExperience) {
                    alert('Please fill in Current Job Title, Current Employer, and Years of Experience before proceeding.');
                    return;
                  }
                  setStep(2);
                }}
                className="bg-accent-blue hover:bg-blue-600 text-bg font-bold px-8 py-3 rounded-lg transition-all"
              >
                NEXT_STEP
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-2xl font-bold text-primary mb-6">Your Goals</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted uppercase tracking-wider">Desired Job Title</label>
                <input 
                  type="text" 
                  className="w-full bg-bg border border-border rounded-lg px-4 py-3 focus:border-accent-blue outline-none transition-colors"
                  placeholder="Software Engineer"
                  value={formData.desiredJobTitle}
                  onChange={(e) => setFormData({...formData, desiredJobTitle: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted uppercase tracking-wider">Target Province</label>
                <select 
                  className="w-full bg-bg border border-border rounded-lg px-4 py-3 focus:border-accent-blue outline-none transition-colors appearance-none"
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
                <label className="text-xs font-mono text-muted uppercase tracking-wider">Salary Expectation (CAD/yr)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-mono">$</span>
                  <input 
                    type="number" 
                    min="1"
                    className="w-full bg-bg border border-border rounded-lg pl-8 pr-4 py-3 focus:border-accent-green outline-none transition-colors font-mono"
                    placeholder="105000"
                    value={formData.salaryExpectation || ''}
                    onChange={(e) => setFormData({...formData, salaryExpectation: parseInt(e.target.value) || 0})}
                  />
                </div>
                {formData.salaryExpectation > 0 && (
                  <div className="text-xs text-accent-green font-mono">${formData.salaryExpectation.toLocaleString()}/year</div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted uppercase tracking-wider">Technical Skills <span className="text-muted/50">(max 8)</span></label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.technicalSkills.map((skill, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-accent-blue/10 border border-accent-blue/30 text-accent-blue text-xs font-mono px-2.5 py-1 rounded-lg">
                      {skill}
                      <button type="button" onClick={() => setFormData({...formData, technicalSkills: formData.technicalSkills.filter((_, idx) => idx !== i)})} className="hover:text-red-400 ml-1">&times;</button>
                    </span>
                  ))}
                </div>
                <input 
                  type="text" 
                  className="w-full bg-bg border border-border rounded-lg px-4 py-3 focus:border-accent-blue outline-none transition-colors"
                  placeholder="Type a skill and press Enter"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = skillInput.trim();
                      if (val && formData.technicalSkills.length < 8 && !formData.technicalSkills.includes(val)) {
                        setFormData({...formData, technicalSkills: [...formData.technicalSkills, val]});
                        setSkillInput('');
                      }
                    }
                  }}
                />
                <p className="text-[10px] text-muted mt-1">Press Enter after each skill</p>
              </div>
              <div className="space-y-2 col-span-2">
                <div className="flex justify-between">
                  <label className="text-xs font-mono text-muted uppercase tracking-wider">Professional Summary <span className="text-muted/50">(optional)</span></label>
                  <span className="text-[10px] text-muted font-mono">{formData.professionalSummary.length}/500</span>
                </div>
                <textarea
                  className="w-full bg-bg border border-border rounded-lg px-4 py-3 focus:border-accent-blue outline-none transition-colors h-24 resize-none"
                  placeholder="Briefly describe your experience for Canadian employers..."
                  maxLength={500}
                  value={formData.professionalSummary}
                  onChange={(e) => setFormData({...formData, professionalSummary: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted uppercase tracking-wider">Earliest Start Date</label>
                <input 
                  type="date" 
                  className="w-full bg-bg border border-border rounded-lg px-4 py-3 focus:border-accent-blue outline-none transition-colors"
                  value={formData.availability}
                  onChange={(e) => setFormData({...formData, availability: e.target.value})}
                />
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-4 p-4 bg-accent-blue/5 border border-accent-blue/20 rounded-xl cursor-pointer hover:bg-accent-blue/10 transition-colors">
                  <input 
                    type="checkbox" 
                    className="accent-accent-blue w-5 h-5"
                    checked={formData.inCanada}
                    onChange={(e) => setFormData({...formData, inCanada: e.target.checked})}
                  />
                  <span className="text-sm text-primary font-bold">I am currently located in Canada</span>
                </label>
              </div>
            </div>
            <div className="flex justify-between mt-8">
              <button 
                onClick={() => setStep(1)}
                className="text-muted hover:text-white font-mono text-sm"
              >
                PREVIOUS
              </button>
              <button 
                onClick={() => setStep(3)}
                className="bg-accent-blue hover:bg-blue-600 text-bg font-bold px-8 py-3 rounded-lg transition-all"
              >
                NEXT_STEP
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 text-center">
            <h2 className="text-2xl font-bold text-primary">Final Verification</h2>
            <p className="text-muted max-w-md mx-auto">
              LMIABridge will now deploy a TinyFish AI agent to scan live Canadian Job Bank data for positions matching your profile.
            </p>
            
            <div className="max-w-md mx-auto">
              <AgentStatusPanel 
                agentName="JOB_SCAN_AGENT"
                url="jobbank.gc.ca"
                status={agentStatus}
                message={agentMessage}
              />
            </div>

            {agentStatus === 'idle' && (
              <div className="flex flex-col items-center gap-4">
                <button 
                  onClick={handleScan}
                  className="w-full max-w-md bg-accent-green hover:bg-green-500 text-bg font-black px-8 py-5 rounded-xl transition-all shadow-[0_0_30px_rgba(0,255,148,0.2)] text-xl tracking-tighter"
                >
                  SCAN JOB BANK NOW
                </button>
                <button 
                  onClick={() => setStep(2)}
                  className="text-muted hover:text-white font-mono text-sm"
                >
                  BACK_TO_EDIT
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

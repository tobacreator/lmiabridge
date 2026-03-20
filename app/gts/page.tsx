'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function GTSContent() {
  const searchParams = useSearchParams();
  const noc = searchParams.get('noc') || '21232';
  const categoryRaw = searchParams.get('category') || 'A';
  
  // Determine GTS category from NOC parameter
  // Typically Category A is for unique/specialized talent referred by a designated partner
  // Category B is for specific in-demand tech roles on the Global Talent Occupations List (like 21232)
  const category = (noc === '21232' || noc === '21231') ? 'B' : categoryRaw;

  return (
    <div className="min-h-screen bg-bg relative overflow-hidden py-20 px-6">
      {/* Premium Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-accent-amber/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent-blue/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center gap-2 bg-accent-amber/10 border border-accent-amber/30 px-4 py-1.5 rounded-full mb-6">
            <span className="text-accent-amber font-bold text-sm tracking-widest uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-amber animate-pulse shadow-[0_0_10px_rgba(255,184,0,0.8)]" />
              PRIORITY PROCESSING ACTIVATED
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-6">
            Global Talent <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-amber to-accent-blue">Stream</span>
          </h1>
          <p className="text-xl text-primary/80 max-w-2xl mx-auto leading-relaxed">
            Your profile matches an elite immigration pathway. The GTS fast-lane bypasses standard LMIA delays, bringing you to Canada in weeks, not months.
          </p>
        </div>

        {/* Classification Card */}
        <div className="bg-surface/80 backdrop-blur-md border border-accent-amber/20 rounded-3xl p-8 md:p-12 mb-12 shadow-[0_0_50px_rgba(255,184,0,0.05)] relative overflow-hidden animate-in zoom-in-95 duration-700 delay-100">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <svg className="w-48 h-48 text-accent-amber" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
          </div>
          
          <div className="flex flex-col md:flex-row items-start gap-8 relative z-10">
            <div className="w-24 h-24 shrink-0 bg-gradient-to-br from-accent-amber to-orange-600 rounded-2xl flex items-center justify-center text-5xl font-black text-white shadow-2xl skew-x-[-5deg]">
              {category}
            </div>
            <div>
              <h2 className="text-3xl font-black text-white mb-3">Category {category} Eligible</h2>
              {category === 'B' ? (
                <p className="text-primary/80 leading-relaxed mb-6">
                  Your occupation (NOC {noc}) is listed on the federal <strong className="text-white">Global Talent Occupations List</strong>. Because Canadian employers are actively facing severe shortages for this highly-skilled technical role, you qualify for expedited processing without needing a referral partner.
                </p>
              ) : (
                <p className="text-primary/80 leading-relaxed mb-6">
                  Your profile indicates specialized, unique talent. Under Category A, if an employer is referred by a designated economic development partner, you qualify for immediate expedited processing to help scale a high-growth Canadian firm.
                </p>
              )}
              
              <div className="space-y-3">
                <h3 className="text-sm font-mono text-muted uppercase tracking-widest border-b border-border/50 pb-2 mb-4">Core Requirements</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm text-primary">
                    <span className="text-accent-amber mt-0.5 font-bold">✓</span>
                    {category === 'B' ? 'Minimum salary must meet prevailing wage or $80,000 CAD (whichever is higher).' : 'Employer must be referred by a designated designated federal/provincial partner.'}
                  </li>
                  <li className="flex items-start gap-3 text-sm text-primary">
                    <span className="text-accent-amber mt-0.5 font-bold">✓</span>
                    Valid job offer from an eligible Canadian employer.
                  </li>
                  <li className="flex items-start gap-3 text-sm text-primary">
                    <span className="text-accent-amber mt-0.5 font-bold">✓</span>
                    Employer must commit to a custom Labour Market Benefits Plan (LMBP).
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Visual */}
        <div className="mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          <h3 className="text-center text-sm font-mono text-muted uppercase tracking-widest mb-8">The GTS Advantage</h3>
          
          <div className="relative">
            {/* Standard timeline track */}
            <div className="absolute top-1/2 left-0 w-full h-1 bg-border -translate-y-1/2 rounded-full hidden md:block" />
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
              
              <div className="bg-card border border-border p-6 rounded-2xl relative text-center">
                <div className="w-8 h-8 rounded-full bg-surface border-2 border-border flex items-center justify-center mx-auto mb-4 text-xs font-bold text-muted relative z-10 md:absolute md:-top-4 md:left-1/2 md:-translate-x-1/2">
                  1
                </div>
                <div className="text-xs font-mono text-muted uppercase mb-2">Days 1-3</div>
                <div className="font-bold text-white text-sm">Application Prep</div>
              </div>

              <div className="bg-card border border-border p-6 rounded-2xl relative text-center">
                <div className="w-8 h-8 rounded-full bg-surface border-2 border-border flex items-center justify-center mx-auto mb-4 text-xs font-bold text-muted relative z-10 md:absolute md:-top-4 md:left-1/2 md:-translate-x-1/2">
                  2
                </div>
                <div className="text-xs font-mono text-muted uppercase mb-2">Days 4-10</div>
                <div className="font-bold text-white text-sm">ESDC Review</div>
              </div>

              <div className="bg-accent-amber/5 border border-accent-amber/30 p-6 rounded-2xl relative text-center transform scale-105 shadow-[0_0_30px_rgba(255,184,0,0.1)]">
                <div className="w-8 h-8 rounded-full bg-accent-amber border-2 border-accent-amber flex items-center justify-center mx-auto mb-4 text-xs font-black text-bg relative z-10 md:absolute md:-top-4 md:left-1/2 md:-translate-x-1/2 shadow-[0_0_10px_rgba(255,184,0,0.5)]">
                  3
                </div>
                <div className="text-xs font-mono text-accent-amber font-bold shadow-sm uppercase mb-2">Day ~14</div>
                <div className="font-black text-white text-lg">GTS Approval</div>
              </div>

              <div className="bg-card border border-border p-6 rounded-2xl relative text-center opacity-70">
                <div className="w-8 h-8 rounded-full bg-surface border-2 border-border flex items-center justify-center mx-auto mb-4 text-xs font-bold text-muted relative z-10 md:absolute md:-top-4 md:left-1/2 md:-translate-x-1/2">
                  4
                </div>
                <div className="text-xs font-mono text-muted uppercase mb-2">Weeks 3-4</div>
                <div className="font-bold text-white text-sm">Work Permit Prep</div>
              </div>

            </div>
          </div>
          <p className="text-center text-xs text-muted font-mono mt-8 italic">Standard LMIA processing: 3-5 months. GTS processing standard: 10 business days.</p>
        </div>

        {/* CTA */}
        <div className="text-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
          <Link href="/worker/matches" className="inline-flex items-center justify-center gap-3 bg-white text-bg hover:bg-gray-200 transition-all font-black px-10 py-5 rounded-2xl text-xl hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.2)]">
            START GTS APPLICATION
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </Link>
          <div className="mt-6">
            <Link href="/worker/matches" className="text-sm font-mono text-muted hover:text-white transition-colors">
              RETURN TO STANDARD MATCHES
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function GTSFastLane() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg flex items-center justify-center"><div className="animate-pulse text-muted font-mono">Loading GTS data...</div></div>}>
      <GTSContent />
    </Suspense>
  );
}

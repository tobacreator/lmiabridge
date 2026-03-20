import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 relative overflow-hidden bg-bg">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-accent-green/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-accent-amber/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Powered by TinyFish Badge */}
      <div className="absolute top-6 left-6 md:top-8 md:left-8">
        <div className="flex items-center space-x-2 bg-surface/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
          <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
          <span className="text-xs font-mono font-medium tracking-wide text-white/80">
            Powered by TinyFish AI
          </span>
        </div>
      </div>

      <div className="z-10 max-w-4xl w-full flex flex-col items-center text-center space-y-8 mt-16">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-tight">
          Canada's <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-green to-emerald-400">LMIA Compliance</span> Agent
        </h1>
        
        <p className="text-lg md:text-xl text-white/60 max-w-2xl font-mono leading-relaxed">
          AI-powered tracking, matching, and compliance validation for the Canadian Labour Market. Fast, reliable, and entirely transparent.
        </p>

        <p className="text-sm italic text-gray-400 text-center">
          Built by an immigrant founder navigating the LMIA process personally.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-8 w-full justify-center">
          <Link 
            href="/employer" 
            className="group relative px-8 py-4 bg-white text-bg font-bold rounded-lg overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] w-full sm:w-auto"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              For Employers
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          </Link>
          
          <Link 
            href="/worker" 
            className="group px-8 py-4 bg-surface text-white border border-white/10 font-bold rounded-lg transition-all hover:bg-white/5 hover:border-white/20 hover:scale-105 w-full sm:w-auto"
          >
            <span className="flex items-center justify-center gap-2">
              For Workers
            </span>
          </Link>
        </div>

        <div className="pt-2 w-full flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
           <Link href="/verify" className="flex items-center gap-3 px-6 py-3 bg-accent-amber/10 border border-accent-amber/30 hover:bg-accent-amber/20 hover:border-accent-amber/50 text-accent-amber rounded-full font-mono text-sm font-bold transition-all hover:scale-105">
              <span className="w-2 h-2 rounded-full bg-accent-amber animate-pulse shadow-[0_0_10px_rgba(255,184,0,0.8)]" />
              Worried about LMIA fraud? → Verify any employer free
           </Link>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-20 w-full">
          {[
            { title: "Smart Matching", desc: "AI-driven algorithms to connect workers with eligible LMIA roles." },
            { title: "Automated Compliance", desc: "Real-time updates on tracking, processing, and advertising." },
            { title: "GTS Eligibility", desc: "Instant evaluation for Global Talent Stream fast-tracking." }
          ].map((feature, i) => (
            <div key={i} className="flex flex-col items-start p-6 bg-surface/50 border border-white/5 rounded-2xl backdrop-blur-sm transition-colors hover:bg-surface/80 hover:border-white/10 cursor-default">
              <h3 className="font-bold text-lg text-white mb-2">{feature.title}</h3>
              <p className="text-sm font-mono text-white/50 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

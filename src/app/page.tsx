import DocumentUpload from '@/components/DocumentUpload';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen font-sans relative overflow-hidden">
      {/* Dynamic Background Effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />

      <main className="container mx-auto px-4 py-16 relative z-10">
        <div className="flex flex-col items-center mb-12 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-white/80">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>AI-Powered Hackathon ATS</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            Automate Project <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">Evaluation</span>
          </h1>
          <p className="max-w-xl text-neutral-400 text-lg">
            The central hub for all project evaluations. AI-driven insights to help
            you discover the next big thing. You&apos;re logged in as Admin.
          </p>
          <div className="flex justify-center gap-4 animate-in mt-12 fade-in slide-in-from-bottom-8 duration-700 delay-500">
            <Link href="/login">
              <Button variant="outline" className="text-neutral-300 border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
                Judge / Admin Login
              </Button>
            </Link>
            <Link href="/submit-code">
              <Button variant="outline" className="text-neutral-300 border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
                Phase 2: Submit Code
              </Button>
            </Link>
          </div>
        </div>

        <DocumentUpload />
      </main>
    </div>
  );
}

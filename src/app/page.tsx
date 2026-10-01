import DocumentUpload from '@/components/DocumentUpload';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sparkles, FileText, Cpu, Trophy } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen font-sans relative overflow-hidden pb-16">
      {/* Dynamic Background Effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />

      <main className="container mx-auto px-4 py-12 relative z-10 max-w-5xl">
        <div className="flex flex-col items-center mb-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-white/80">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>AI-Powered Hackathon ATS</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            Automate Project <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">Evaluation</span>
          </h1>
          <p className="max-w-2xl text-neutral-400 text-lg">
            Upload your project pitch deck. Our AI instantly analyzes innovation, feasibility, detects plagiarism, and calculates your standardized ATS score.
          </p>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link href="/login">
              <Button variant="default" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
                Judge / Admin Portal
              </Button>
            </Link>
            <Link href="/submit-code">
              <Button variant="outline" className="text-neutral-300 border-neutral-800 bg-neutral-900/50 backdrop-blur-sm hover:bg-neutral-800">
                Phase 2: Submit Codebase
              </Button>
            </Link>
          </div>
        </div>

        {/* 3-Step Guided Workflow Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-xl p-4 flex items-start gap-3 backdrop-blur-sm">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">1. Submit Pitch Deck</h2>
              <p className="text-xs text-neutral-400 mt-0.5">Upload a PDF with your team details & problem statement.</p>
            </div>
          </div>

          <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-xl p-4 flex items-start gap-3 backdrop-blur-sm">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">2. Instant AI Scoring</h2>
              <p className="text-xs text-neutral-400 mt-0.5">Gemini evaluates criteria, strengths, and missing slides.</p>
            </div>
          </div>

          <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-xl p-4 flex items-start gap-3 backdrop-blur-sm">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">3. Ranked Leaderboard</h2>
              <p className="text-xs text-neutral-400 mt-0.5">Projects are ranked automatically with PDF feedback reports.</p>
            </div>
          </div>
        </div>

        <DocumentUpload />
      </main>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Brain, Target, AlertTriangle, CheckCircle2, BarChart3,
    Github, Loader2, UploadCloud, FileText, Trophy, Users
} from 'lucide-react';
import ScoreRadarChart from '@/components/ScoreRadarChart';

interface ITeamMember {
    name: string;
    email?: string;
    college?: string;
    department?: string;
    rollNo?: string;
}

interface ITeamData {
    _id: string;
    name: string;
    track: string;
    projectTitle?: string;
    problemStatement: string;
    solutionDescription?: string;
    college?: string;
    leaderPhone?: string;
    members: ITeamMember[];
    githubUrl?: string;
    isShortlisted: boolean;
    hackathon?: {
        name: string;
        theme: string;
        description: string;
        isCodeSubmissionOpen: boolean;
    };
}

interface IAI {
    totalScore?: number;
    summaryForJudges?: string;
    criteriaScores?: { criterion: string; score: number; reasoning: string }[];
    missingSections?: string[];
    strengths?: string[];
    weaknesses?: string[];
    plagiarismFlag?: boolean;
    plagiarismWarning?: string;
    githubAnalysis?: {
        technicalComplexity: number;
        codeQuality: string;
        commitActivity: string;
    };
}

interface ISubmissionData {
    _id: string;
    status: 'PENDING' | 'AI_PROCESSING' | 'EVALUATED' | 'FAILED';
    fileName?: string;
    fileUrl?: string;
    fileFormat?: string;
    slideCount?: number;
    hasVisualAssets?: boolean;
    extractionError?: string;
    aiEvaluation?: IAI;
}

export default function ParticipantDashboard() {
    const [team, setTeam] = useState<ITeamData | null>(null);
    const [submission, setSubmission] = useState<ISubmissionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Presentation Upload State (inside dashboard)
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [showReupload, setShowReupload] = useState(false);

    // Phase 2 Code Submission State
    const [githubUrl, setGithubUrl] = useState('');
    const [isSubmittingCode, setIsSubmittingCode] = useState(false);
    const [codeSubmitStatus, setCodeSubmitStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });

    const fetchDashboardData = async () => {
        try {
            const res = await fetch('/api/user-submission');
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Failed to load dashboard. Please log in.');
                setLoading(false);
                return;
            }

            if (data.success) {
                setTeam(data.team || null);
                setSubmission(data.submission || null);
            }
        } catch (e) {
            console.error(e);
            setError('Network error loading dashboard');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const handlePresentationUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadFile) return;

        setIsUploading(true);
        setUploadError(null);

        const formData = new FormData();
        formData.append('file', uploadFile);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setUploadFile(null);
                fetchDashboardData();
            } else {
                setUploadError(data.error || 'Failed to analyze presentation.');
            }
        } catch {
            setUploadError('Network error during upload.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleCodeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!team || !githubUrl) return;

        setIsSubmittingCode(true);
        setCodeSubmitStatus({ type: 'idle', message: '' });

        try {
            const res = await fetch('/api/submit-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamId: team._id, githubUrl })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setCodeSubmitStatus({ type: 'success', message: 'Successfully analyzed and linked codebase!' });
                setGithubUrl('');
                fetchDashboardData();
            } else {
                setCodeSubmitStatus({ type: 'error', message: data.error || 'Failed to submit code.' });
            }
        } catch {
            setCodeSubmitStatus({ type: 'error', message: 'Network error. Please try again.' });
        } finally {
            setIsSubmittingCode(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center text-white gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-neutral-400">Loading your team dashboard...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center text-white p-4">
                <Card className="max-w-md w-full border-red-500/30 bg-background/60 backdrop-blur-md text-center p-6 space-y-4">
                    <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
                    <h3 className="text-xl font-bold">Access Restricted</h3>
                    <p className="text-sm text-neutral-400">{error}</p>
                    <Button asChild className="w-full bg-primary text-black font-semibold">
                        <Link href="/login">Sign In</Link>
                    </Button>
                </Card>
            </div>
        );
    }

    if (!team) {
        return (
            <div className="min-h-screen bg-neutral-950 flex justify-center items-center p-4">
                <Card className="max-w-md w-full border-primary/20 bg-background/60 backdrop-blur-md text-center p-6 space-y-4">
                    <Trophy className="w-10 h-10 text-primary mx-auto" />
                    <CardTitle className="text-2xl font-bold">No Team Registered</CardTitle>
                    <CardDescription>
                        You are logged in, but you haven&apos;t registered your hackathon team profile yet.
                    </CardDescription>
                    <Button asChild className="w-full bg-primary text-black font-bold">
                        <Link href="/register">Register Team Now</Link>
                    </Button>
                </Card>
            </div>
        );
    }

    const ai = submission?.aiEvaluation;
    const isCodePhaseOpen = team.hackathon?.isCodeSubmissionOpen || false;

    return (
        <div className="min-h-screen p-6 md:p-10 relative">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-5xl mx-auto space-y-8 relative z-10">
                {/* Team Header Profile */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-neutral-900/60 p-6 rounded-2xl border border-neutral-800 backdrop-blur-md">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                                {team.hackathon?.name || 'Hackathon Project'}
                            </span>
                            <Badge variant="outline" className="border-indigo-500/50 text-indigo-300">
                                {team.track} Track
                            </Badge>
                            {team.isShortlisted && (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                    🏆 Shortlisted for Round 2
                                </Badge>
                            )}
                        </div>
                        <h1 className="text-3xl font-extrabold text-white">{team.name}</h1>
                        {team.projectTitle && (
                            <p className="text-primary font-medium text-sm mt-0.5">{team.projectTitle}</p>
                        )}
                        <p className="text-neutral-400 text-sm mt-2 max-w-2xl">{team.problemStatement}</p>

                        {team.college && (
                            <div className="flex items-center gap-2 text-xs text-neutral-500 mt-2">
                                <span>🏛️ {team.college}</span>
                                {team.leaderPhone && <span>• 📞 {team.leaderPhone}</span>}
                            </div>
                        )}
                    </div>

                    {ai?.totalScore !== undefined && (
                        <div className="flex flex-col items-center bg-primary/10 border border-primary/20 px-6 py-4 rounded-xl">
                            <span className="text-xs text-primary font-semibold uppercase">ATS Score</span>
                            <span className="text-4xl font-extrabold text-white mt-1">
                                {ai.totalScore}
                                <span className="text-xs text-neutral-500 font-normal"> / 100</span>
                            </span>
                        </div>
                    )}
                </div>

                {/* Team Members Roster */}
                {team.members && team.members.length > 0 && (
                    <Card className="border-neutral-800 bg-neutral-900/40 backdrop-blur-sm">
                        <CardHeader className="py-3 px-5 border-b border-neutral-800/60">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-neutral-300">
                                <Users className="w-4 h-4 text-primary" /> Registered Team Members ({team.members.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 flex flex-wrap gap-2">
                            {team.members.map((m, idx) => (
                                <div key={idx} className="bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800 text-xs">
                                    <span className="font-semibold text-white">{m.name}</span>
                                    {m.college && <span className="text-neutral-400"> ({m.college})</span>}
                                    {m.email && <span className="text-neutral-500 block text-[11px]">{m.email}</span>}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* --- Pitch Deck Upload or Evaluation Section --- */}
                {!submission || submission.status === 'FAILED' || showReupload ? (
                    <Card className="border-primary/30 bg-neutral-900/60 backdrop-blur-md">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-lg text-white">
                                        <UploadCloud className="w-5 h-5 text-primary" /> {submission?.status === 'FAILED' ? 'Retry Presentation Upload' : showReupload ? 'Re-upload Presentation' : 'Upload Project Presentation'}
                                    </CardTitle>
                                    <CardDescription>
                                        Upload your presentation in PDF (.pdf), PowerPoint (.pptx), or legacy PowerPoint (.ppt) format.
                                    </CardDescription>
                                </div>
                                {showReupload && (
                                    <Button variant="ghost" size="sm" onClick={() => setShowReupload(false)} className="text-neutral-400 hover:text-white">
                                        Cancel
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handlePresentationUpload} className="space-y-4">
                                <div className="border-2 border-dashed border-neutral-700 hover:border-primary/50 rounded-xl p-8 text-center transition-colors">
                                    <FileText className="w-10 h-10 text-primary mx-auto mb-2 opacity-60" />
                                    <input
                                        type="file"
                                        accept=".pdf,.pptx,.ppt,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint"
                                        id="deckUpload"
                                        onChange={(e) => {
                                            setUploadFile(e.target.files?.[0] || null);
                                            setUploadError(null);
                                        }}
                                        className="hidden"
                                    />
                                    <label htmlFor="deckUpload" className="cursor-pointer block">
                                        {uploadFile ? (
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Badge variant="outline" className="uppercase text-[10px] px-2 py-0.5 border-primary/40 text-primary">
                                                        {uploadFile.name.split('.').pop() || 'FILE'}
                                                    </Badge>
                                                    <span className="text-sm font-semibold text-white">{uploadFile.name}</span>
                                                </div>
                                                <p className="text-xs text-neutral-400">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB • Ready to analyze</p>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="text-sm font-semibold text-white hover:text-primary">
                                                    Click to select presentation deck (PDF, PPTX, or PPT)
                                                </span>
                                                <p className="text-xs text-neutral-500 mt-1">Supports .pdf, .pptx, and .ppt up to 25MB</p>
                                            </>
                                        )}
                                    </label>
                                </div>

                                {uploadError && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
                                        {uploadError}
                                    </div>
                                )}

                                {submission?.status === 'FAILED' && !uploadError && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
                                        Previous evaluation failed: {submission.extractionError || 'Unable to parse presentation. Please upload a valid presentation file.'}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    disabled={!uploadFile || isUploading}
                                    className="w-full bg-primary hover:bg-primary/90 text-black font-bold h-10"
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Extracting Slides & Running AI Evaluation...
                                        </>
                                    ) : (
                                        'Submit Presentation for AI Evaluation'
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                ) : submission.status === 'AI_PROCESSING' ? (
                    <Card className="border-primary/20 bg-background/60 backdrop-blur-md">
                        <CardContent className="py-12 text-center text-neutral-400">
                            <Brain className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse" />
                            <h3 className="text-lg font-medium text-white mb-1">AI is analyzing your presentation...</h3>
                            <p className="text-sm">Extracting slides, tables, and evaluating innovation against track rubrics.</p>
                            <Button onClick={fetchDashboardData} variant="outline" size="sm" className="mt-4 border-neutral-700">
                                Refresh Status
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Submission Metadata Banner */}
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900/50 border border-neutral-800 px-5 py-3 rounded-xl text-xs text-neutral-400">
                            <div className="flex items-center gap-3">
                                <FileText className="w-4 h-4 text-primary" />
                                <span className="text-white font-medium">{submission.fileName || 'Presentation Deck'}</span>
                                {submission.fileFormat && (
                                    <Badge variant="outline" className="uppercase text-[10px] px-1.5 py-0 border-primary/40 text-primary">
                                        {submission.fileFormat}
                                    </Badge>
                                )}
                                {submission.slideCount && (
                                    <span className="text-neutral-400">• {submission.slideCount} Slides Extracted</span>
                                )}
                                {submission.hasVisualAssets && (
                                    <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                        Visual assets flagged
                                    </Badge>
                                )}
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setShowReupload(true)} className="h-7 text-xs text-neutral-300 hover:text-white">
                                Re-upload Presentation
                            </Button>
                        </div>

                        {/* Executive Summary */}
                        <Card className="border-primary/20 bg-background/60 backdrop-blur-md">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Brain className="w-5 h-5 text-primary" /> AI Executive Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="leading-relaxed text-neutral-300">
                                    {ai?.summaryForJudges || 'No summary available.'}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Plagiarism Warning if flagged */}
                        {ai?.plagiarismFlag && (
                            <div className="bg-amber-950/40 border border-amber-500/50 p-4 rounded-xl flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-semibold text-amber-300">Originality Warning Flagged</h4>
                                    <p className="text-xs text-neutral-300 mt-0.5">{ai.plagiarismWarning || 'Idea exhibits common hackathon cliché patterns.'}</p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Strengths */}
                            <Card className="border-green-900/50 bg-background/60 backdrop-blur-md">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg text-green-400">
                                        <CheckCircle2 className="w-5 h-5" /> Key Strengths
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {(ai?.strengths?.length ?? 0) > 0 ? (
                                        <ul className="space-y-2">
                                            {ai?.strengths?.map((str, i) => (
                                                <li key={i} className="flex gap-2 items-start text-sm text-neutral-300">
                                                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                                    <span>{str}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No notable strengths identified.</p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Weaknesses */}
                            <Card className="border-red-900/50 bg-background/60 backdrop-blur-md">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg text-red-400">
                                        <AlertTriangle className="w-5 h-5" /> Areas for Improvement
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {(ai?.missingSections?.length ?? 0) > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold mb-2 text-red-300">Missing Mandatory Slides:</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {ai?.missingSections?.map((sec, i) => (
                                                    <Badge key={i} variant="destructive" className="bg-red-900/40 text-red-200">
                                                        {sec}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {(ai?.weaknesses?.length ?? 0) > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold mb-2 text-neutral-300">General Recommendations:</h4>
                                            <ul className="list-disc pl-5 space-y-1">
                                                {ai?.weaknesses?.map((weak, i) => (
                                                    <li key={i} className="text-sm text-neutral-400">{weak}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Criteria Breakdown */}
                            <Card className="border-primary/20 bg-background/60 backdrop-blur-md">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg text-white">
                                        <Target className="w-5 h-5 text-primary" /> Criteria Scoring
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {ai?.criteriaScores?.map((crit, idx) => (
                                        <div key={idx} className="space-y-1">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="font-semibold text-white">{crit.criterion}</span>
                                                <span className="text-primary font-bold">{crit.score}</span>
                                            </div>
                                            <p className="text-xs text-neutral-400">{crit.reasoning}</p>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            {/* Radar Chart */}
                            <Card className="border-primary/20 bg-background/60 backdrop-blur-md">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg text-white">
                                        <BarChart3 className="w-5 h-5 text-primary" /> Skill Distribution
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {(ai?.criteriaScores?.length ?? 0) > 0 ? (
                                        <ScoreRadarChart
                                            data={ai?.criteriaScores?.map(c => ({
                                                criterion: c.criterion,
                                                score: c.score,
                                                fullMark: 10
                                            })) || []}
                                        />
                                    ) : (
                                        <div className="text-center py-10 text-muted-foreground">Not enough data to graph</div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </>
                )}

                {/* Phase 2 Code Submission Card (If unlocked) */}
                {isCodePhaseOpen && submission && (
                    <Card className="border-indigo-500/40 bg-indigo-950/20 backdrop-blur-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-indigo-400">
                                <Github className="w-5 h-5" /> Phase 2: GitHub Repository Submission
                            </CardTitle>
                            <CardDescription className="text-indigo-200/70">
                                The code submission portal is unlocked. Submit your public GitHub repository for technical evaluation.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {team.githubUrl ? (
                                <div className="p-4 bg-neutral-900/80 rounded-xl border border-neutral-800 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-neutral-400 uppercase">Linked Codebase</span>
                                        <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Verified</Badge>
                                    </div>
                                    <a href={team.githubUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-400 hover:underline block truncate">
                                        {team.githubUrl}
                                    </a>
                                    {ai?.githubAnalysis && (
                                        <div className="pt-2 border-t border-neutral-800 text-xs text-neutral-300">
                                            Complexity Score: <span className="text-primary font-bold">{ai.githubAnalysis.technicalComplexity}/100</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <form onSubmit={handleCodeSubmit} className="flex flex-col sm:flex-row gap-3">
                                    <Input
                                        type="url"
                                        required
                                        placeholder="https://github.com/organization/repo"
                                        value={githubUrl}
                                        onChange={(e) => setGithubUrl(e.target.value)}
                                        className="bg-neutral-900 border-indigo-900/50 flex-1 text-white"
                                    />
                                    <Button type="submit" disabled={isSubmittingCode} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                                        {isSubmittingCode ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : 'Submit Repo'}
                                    </Button>
                                </form>
                            )}
                            {codeSubmitStatus.message && (
                                <p className={`mt-2 text-xs ${codeSubmitStatus.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                                    {codeSubmitStatus.message}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

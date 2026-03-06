'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brain, Target, AlertTriangle, CheckCircle2, BarChart3, Github, Loader2 } from 'lucide-react';
import ScoreRadarChart from '@/components/ScoreRadarChart';

// Simplified interfaces for frontend
interface IAI {
    totalScore?: number;
    summaryForJudges?: string;
    criteriaScores?: { criterion: string; score: number; reasoning: string }[];
    missingSections?: string[];
    strengths?: string[];
    weaknesses?: string[];
    githubAnalysis?: any;
}

interface ISubmission {
    _id: string;
    status: string;
    team: {
        _id: string;
        name: string;
        problemStatement: string;
        track: string;
        githubUrl?: string;
    };
    aiEvaluation?: IAI;
}

export default function ParticipantDashboard() {
    const [submission, setSubmission] = useState<ISubmission | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Code Submission Phase
    const [isCodePhaseOpen, setIsCodePhaseOpen] = useState(false);
    const [githubUrl, setGithubUrl] = useState('');
    const [isSubmittingCode, setIsSubmittingCode] = useState(false);
    const [codeSubmitStatus, setCodeSubmitStatus] = useState<{ type: 'idle' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });

    const fetchDashboardData = async () => {
        try {
            // Fetch Submission
            const subRes = await fetch('/api/user-submission');
            const subData = await subRes.json();

            if (!subRes.ok) {
                setError(subData.error || 'Failed to load dashboard');
                setLoading(false);
                return;
            }

            if (subData.success && subData.submission) {
                setSubmission(subData.submission);
            }

            // Fetch Settings
            const setRes = await fetch('/api/settings');
            const setData = await setRes.json();
            if (setData.success) {
                setIsCodePhaseOpen(setData.isCodeSubmissionOpen);
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

    const handleCodeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!submission || !githubUrl) return;

        setIsSubmittingCode(true);
        setCodeSubmitStatus({ type: 'idle', message: '' });

        try {
            const res = await fetch('/api/submit-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamId: submission.team._id, githubUrl })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setCodeSubmitStatus({ type: 'success', message: 'Successfully analyzed and linked codebase!' });
                setGithubUrl('');
                // Refresh data to show the new github URL and analysis
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
                <p>Loading Dashboard...</p>
            </div>
        );
    }

    if (error) {
        return <div className="min-h-screen bg-neutral-950 flex justify-center items-center text-red-400">{error}</div>;
    }

    if (!submission) {
        return (
            <div className="min-h-screen bg-neutral-950 flex justify-center items-center p-4">
                <Card className="max-w-md w-full border-primary/20 bg-background/60 backdrop-blur-md text-center">
                    <CardHeader>
                        <CardTitle className="text-2xl">Participant Dashboard</CardTitle>
                        <CardDescription>You have not uploaded a project pitch deck yet.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full"><a href="/">Go to Upload</a></Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const ai = submission.aiEvaluation;

    return (
        <div className="min-h-screen p-8 relative">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-5xl mx-auto space-y-8 relative z-10">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-white">{submission.team.name}</h1>
                            <Badge variant="outline" className="border-indigo-500/50 text-indigo-300">
                                {submission.team.track || 'General'} Track
                            </Badge>
                            <Badge
                                variant={submission.status === 'EVALUATED' ? 'default' : 'secondary'}
                                className={submission.status === 'EVALUATED' ? 'bg-primary/20 text-primary border-primary/30' : ''}
                            >
                                {submission.status}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mt-2 max-w-2xl">{submission.team.problemStatement}</p>
                    </div>
                    {ai?.totalScore !== undefined && (
                        <div className="flex flex-col items-end">
                            <span className="text-sm text-muted-foreground mb-1">Total Score</span>
                            <div className="bg-primary/20 text-primary border border-primary/30 h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold">
                                {ai.totalScore}
                            </div>
                        </div>
                    )}
                </div>

                {/* --- Code Submission Phase Logic --- */}
                {isCodePhaseOpen && !submission.team.githubUrl && (
                    <Card className="border-indigo-500/30 bg-indigo-950/20 backdrop-blur-md animate-in slide-in-from-top-4">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-indigo-400">
                                <Github className="w-5 h-5" /> Phase 2 Unlocked: Submit Codebase
                            </CardTitle>
                            <CardDescription className="text-indigo-200/70">
                                The organizers have unlocked the code submission phase. Drop your repository link here.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCodeSubmit} className="flex flex-col md:flex-row gap-4">
                                <Input
                                    type="url"
                                    required
                                    placeholder="https://github.com/team/project"
                                    value={githubUrl}
                                    onChange={(e) => setGithubUrl(e.target.value)}
                                    className="bg-neutral-900 border-indigo-900/50 flex-1 text-white"
                                />
                                <Button type="submit" disabled={isSubmittingCode} className="bg-indigo-600 hover:bg-indigo-700">
                                    {isSubmittingCode ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : 'Submit Repository'}
                                </Button>
                            </form>
                            {codeSubmitStatus.message && (
                                <p className={`mt-3 text-sm ${codeSubmitStatus.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                                    {codeSubmitStatus.message}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Main AI Feedback Section (Wait for evaluation) */}
                {submission.status !== 'EVALUATED' ? (
                    <Card className="border-primary/20 bg-background/60 backdrop-blur-md">
                        <CardContent className="py-12 text-center text-neutral-400">
                            <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-medium text-white mb-1">AI is analyzing your submission...</h3>
                            <p>Check back shortly to see your score and detailed feedback.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <Card className="border-primary/20 bg-background/60 backdrop-blur-md">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Brain className="w-5 h-5 text-primary" /> Executive Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="leading-relaxed text-neutral-300">
                                    {ai?.summaryForJudges || 'No summary available.'}
                                </p>
                            </CardContent>
                        </Card>

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
                                        <ul className="space-y-3">
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
                                            <h4 className="text-sm font-semibold mb-2">Missing Required Slides:</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {ai?.missingSections?.map((sec, i) => (
                                                    <Badge key={i} variant="destructive" className="bg-red-900/40 text-red-200 hover:bg-red-900/60">{sec}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {(ai?.weaknesses?.length ?? 0) > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold mb-2 mt-4">General Weaknesses:</h4>
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
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Target className="w-5 h-5" /> Score Breakdown
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {ai?.criteriaScores?.map((crit, idx) => (
                                        <div key={idx} className="space-y-1">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="font-semibold">{crit.criterion}</span>
                                                <span className="text-primary font-bold">{crit.score}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{crit.reasoning}</p>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            {/* Radar Chart Localization */}
                            <Card className="border-primary/20 bg-background/60 backdrop-blur-md">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <BarChart3 className="w-5 h-5" /> Skill Distribution
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

                            {/* GitHub Code Analysis Panel */}
                            {ai?.githubAnalysis && (
                                <Card className="md:col-span-2 border-indigo-900/50 bg-indigo-950/10 backdrop-blur-md">
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between text-lg text-indigo-400">
                                            <div className="flex items-center gap-2">
                                                <Github className="w-5 h-5" /> External Code Analysis
                                            </div>
                                            <Badge className="bg-indigo-900 text-indigo-100">Complexity Score: {ai.githubAnalysis.technicalComplexity}/100</Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <h4 className="text-sm font-semibold mb-1 text-white">Repository Link</h4>
                                            <a href={submission.team.githubUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-400 hover:underline">
                                                {submission.team.githubUrl}
                                            </a>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold mb-1 text-white">Code Quality & Stack</h4>
                                            <p className="text-sm text-neutral-300">{ai.githubAnalysis.codeQuality}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold mb-1 text-white">Commit Activity</h4>
                                            <p className="text-sm text-neutral-300">{ai.githubAnalysis.commitActivity}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

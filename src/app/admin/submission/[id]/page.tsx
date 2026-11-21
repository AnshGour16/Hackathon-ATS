'use client';

import { useEffect, useState, use } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Brain, Target, AlertTriangle, CheckCircle2, BarChart3, Download, Github, FileText } from 'lucide-react';
import Link from 'next/link';
import ScoreRadarChart from '@/components/ScoreRadarChart';
import { generateFeedbackPDF } from '@/lib/pdf-generator';
import { ISubmission } from '@/models/Submission';
import { ITeam } from '@/models/Team';

// Create a UI specific interface since the API populates the team object
interface ISubmissionWithTeam extends Omit<ISubmission, 'team' | 'hackathon'> {
    team: ITeam;
    hackathon?: { _id: string; name: string; theme: string };
}

export default function SubmissionDetail({ params }: { params: Promise<{ id: string }> }) {
    const unwrappedParams = use(params);
    const [data, setData] = useState<ISubmissionWithTeam | null>(null);
    const [loading, setLoading] = useState(true);
    const [blindMode, setBlindMode] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/settings');
                const json = await res.json();
                if (json.success) setBlindMode(json.blindJudgingEnabled);
            } catch (e) {
                console.error(e);
            }
        };
        const fetchDetail = async () => {
            try {
                const res = await fetch(`/api/submissions/${unwrappedParams.id}`);
                const json = await res.json();
                if (json.success) setData(json.data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
        fetchDetail();
    }, [unwrappedParams.id]);

    if (loading) return <div className="min-h-screen bg-neutral-950 flex justify-center items-center text-white">Loading Evaluation details...</div>;
    if (!data) return <div className="min-h-screen bg-neutral-950 flex justify-center items-center text-white">Submission not found.</div>;

    const ai = data.aiEvaluation;

    return (
        <div className="min-h-screen p-8 relative">
            <div className="absolute top-10 left-10 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-4xl mx-auto space-y-8 relative z-10">
                <div className="flex items-center gap-4">
                    <Button asChild variant="outline" size="icon">
                        <Link href="/admin"><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight">
                                {blindMode ? 'Team Redacted (Blind Mode)' : (data.team?.name || 'Unknown Team')}
                            </h1>
                            <Badge variant="outline" className="border-indigo-500/50 text-indigo-300">
                                {data.team?.track || 'General'} Track
                            </Badge>
                            {data.hackathon && (
                                <Badge variant="secondary" className="bg-purple-950/60 text-purple-300 border border-purple-500/30">
                                    {data.hackathon.name}
                                </Badge>
                            )}
                        </div>
                        <p className="text-muted-foreground mt-1">{data.team?.problemStatement || 'No Problem Statement'}</p>

                        {data.team?.members?.length > 0 && !blindMode && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {data.team.members.map((member: { name: string; department?: string; rollNo?: string }, idx: number) => (
                                    member?.name ? <Badge key={idx} variant="secondary" className="bg-primary/10 text-primary">{member.name} ({member.department} - {member.rollNo})</Badge> : null
                                ))}
                            </div>
                        )}
                        {data.team?.members?.length > 0 && blindMode && (
                            <div className="text-sm text-neutral-500 mt-2 italic">
                                {data.team.members.length} team members (Names and details redacted)
                            </div>
                        )}

                        {data.team?.githubUrl && !blindMode && (
                            <div className="mt-3">
                                <a href={data.team.githubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm text-indigo-400 hover:text-indigo-300">
                                    <Github className="w-4 h-4 mr-1" />
                                    View Repository
                                </a>
                            </div>
                        )}
                        {data.team?.githubUrl && blindMode && (
                            <div className="mt-3 text-sm text-neutral-500 italic flex items-center">
                                <Github className="w-4 h-4 mr-1" />
                                Repository link redacted to prevent bias
                            </div>
                        )}
                    </div>
                    <div className="ml-auto flex items-center gap-4">
                        {data.fileUrl && data.fileUrl !== 'local-memory' && (
                            <Button asChild variant="outline" className="border-neutral-700 text-neutral-300 hover:text-white">
                                <a href={data.fileUrl} target="_blank" rel="noopener noreferrer">
                                    <FileText className="w-4 h-4 mr-2" /> View {data.fileFormat?.toUpperCase() || 'Deck'}
                                </a>
                            </Button>
                        )}
                        <Button
                            variant="default"
                            className="bg-indigo-600 hover:bg-indigo-700"
                            onClick={() => {
                                const exportTeam = blindMode
                                    ? { ...(data.team as unknown as Record<string, unknown>), name: 'Team Redacted (Blind Mode)' }
                                    : (data.team as unknown as Record<string, unknown>);
                                generateFeedbackPDF(exportTeam, ai as unknown as Record<string, unknown>);
                            }}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Download Report
                        </Button>
                        <div className="flex flex-col items-end mr-2">
                            <span className="text-sm text-muted-foreground">ATS Score</span>
                        </div>
                        <div className="bg-primary/20 text-primary border border-primary/30 h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold">
                            {ai?.totalScore || 0}
                        </div>
                    </div>
                </div>

                {/* AI Summary Card */}
                <Card className="border-primary/20 bg-background/60 backdrop-blur-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Brain className="w-5 h-5 text-primary" /> AI Executive Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="leading-relaxed text-neutral-300">
                            {ai?.summaryForJudges || 'No summary generated.'}
                        </p>
                    </CardContent>
                </Card>

                {ai?.plagiarismFlag && (
                    <div className="bg-amber-900/40 border border-amber-500/50 p-4 rounded-xl flex items-start gap-4 animate-in fade-in slide-in-from-bottom-4">
                        <AlertTriangle className="w-8 h-8 text-amber-500 shrink-0 mt-1" />
                        <div>
                            <h3 className="font-bold text-amber-400 text-lg">Potential Idea Plagiarism / Cliche Detected</h3>
                            <p className="text-amber-200/80 text-sm mt-1 mb-2">
                                The AI has flagged this submission as highly derivative or remarkably similar to known past projects/cliches.
                            </p>
                            <div className="bg-amber-950/50 p-3 rounded-lg border border-amber-900/50 text-sm text-amber-300/90 italic">
                                &ldquo;{ai.plagiarismWarning || 'This idea appears to be unoriginal. Please review carefully.'}&rdquo;
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Radar Chart Visualization */}
                    <Card className="border-primary/20 bg-background/60 backdrop-blur-md md:col-span-2 lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <BarChart3 className="w-5 h-5" /> Skill Distribution
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {(ai?.criteriaScores?.length ?? 0) > 0 ? (
                                <ScoreRadarChart
                                    data={ai?.criteriaScores?.map((c: { criterion: string, score: number }) => ({
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

                    {/* Criteria Breakdown */}
                    <Card className="border-primary/20 bg-background/60 backdrop-blur-md md:col-span-2 lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Target className="w-5 h-5" /> Score Breakdown
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {ai?.criteriaScores?.map((crit: { criterion: string, score: number, reasoning: string }, idx: number) => (
                                <div key={idx} className="space-y-1">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-semibold">{crit.criterion}</span>
                                        <span className="text-primary font-bold">{crit.score}/10</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{crit.reasoning}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Missing Sections & Weaknesses */}
                    <Card className="border-red-900/50 bg-background/60 backdrop-blur-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg text-red-400">
                                <AlertTriangle className="w-5 h-5" /> Red Flags & Missing Data
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {(ai?.missingSections?.length ?? 0) > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-2">Missing Sections:</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {ai?.missingSections?.map((sec: string, i: number) => (
                                            <Badge key={i} variant="destructive" className="bg-red-900/40 text-red-200 hover:bg-red-900/60">{sec}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {(ai?.weaknesses?.length ?? 0) > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-2">Key Weaknesses:</h4>
                                    <ul className="list-disc pl-5 space-y-1">
                                        {ai?.weaknesses?.map((weak: string, i: number) => (
                                            <li key={i} className="text-sm text-neutral-400">{weak}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* GitHub Code Analysis */}
                    {ai?.githubAnalysis && (
                        <Card className="md:col-span-2 border-indigo-900/50 bg-background/60 backdrop-blur-md">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between text-lg text-indigo-400">
                                    <div className="flex items-center gap-2">
                                        <Github className="w-5 h-5" /> Code & Technical Analysis
                                    </div>
                                    <Badge className="bg-indigo-900 text-indigo-100">Complexity Score: {ai.githubAnalysis.technicalComplexity}/100</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-semibold mb-1 text-white">Code Quality & Stack</h4>
                                    <p className="text-sm text-neutral-300">{ai.githubAnalysis.codeQuality}</p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold mb-1 text-white">Commit Activity Analysis</h4>
                                    <p className="text-sm text-neutral-300">{ai.githubAnalysis.commitActivity}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Strengths */}
                    <Card className="md:col-span-2 border-green-900/50 bg-background/60 backdrop-blur-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg text-green-400">
                                <CheckCircle2 className="w-5 h-5" /> Key Strengths
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {(ai?.strengths?.length ?? 0) > 0 ? (
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {ai?.strengths?.map((str: string, i: number) => (
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
                </div>
            </div>
        </div>
    );
}

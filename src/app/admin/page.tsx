'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, RefreshCw, Download } from 'lucide-react';
import Link from 'next/link';

import { ISubmission } from '@/models/Submission';
import { ITeam } from '@/models/Team';

interface ISubmissionWithTeam extends Omit<ISubmission, 'team'> {
    team: ITeam;
}

export default function AdminDashboard() {
    const [submissions, setSubmissions] = useState<ISubmissionWithTeam[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCodeSubmissionOpen, setIsCodeSubmissionOpen] = useState(false);
    const [updatingPhase, setUpdatingPhase] = useState(false);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            if (data.success) {
                setIsCodeSubmissionOpen(data.isCodeSubmissionOpen);
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        }
    };

    const togglePhase = async () => {
        setUpdatingPhase(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isCodeSubmissionOpen: !isCodeSubmissionOpen })
            });
            const data = await res.json();
            if (data.success) {
                setIsCodeSubmissionOpen(data.isCodeSubmissionOpen);
            }
        } catch (error) {
            console.error('Failed to toggle phase:', error);
        } finally {
            setUpdatingPhase(false);
        }
    };

    const fetchSubmissions = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/submissions');
            const data = await res.json();
            if (data.success) {
                // Sort by totalScore descending so best projects are at the top
                const sorted = data.data.sort((a: ISubmissionWithTeam, b: ISubmissionWithTeam) =>
                    (b.aiEvaluation?.totalScore || 0) - (a.aiEvaluation?.totalScore || 0)
                );
                setSubmissions(sorted);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubmissions();
        fetchSettings();
    }, []);

    return (
        <div className="min-h-screen p-8 relative">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-6xl mx-auto space-y-8 relative z-10">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Hackathon Leaderboard</h1>
                        <p className="text-neutral-400">All parsed submissions automatically ranked by AI Total Score.</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-3 bg-neutral-900/50 p-3 rounded-lg border border-neutral-800">
                            <div className="text-right">
                                <div className="text-sm font-medium text-white">Code Submission Phase</div>
                                <div className={`text-xs ${isCodeSubmissionOpen ? 'text-green-400' : 'text-neutral-500'}`}>
                                    {isCodeSubmissionOpen ? 'Unlocked' : 'Locked'}
                                </div>
                            </div>
                            <button
                                onClick={togglePhase}
                                disabled={updatingPhase}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${isCodeSubmissionOpen ? 'bg-primary' : 'bg-neutral-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isCodeSubmissionOpen ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <Button asChild variant="outline" className="text-neutral-300 border-neutral-800">
                                <a href="/api/export" download="hackathon_leaderboard.csv">
                                    <Download className="h-4 w-4 mr-2" /> Export CSV
                                </a>
                            </Button>
                            <Button asChild variant="outline" className="text-neutral-300 border-neutral-800">
                                <Link href="/admin/settings">Advanced Settings</Link>
                            </Button>
                            <Button onClick={fetchSubmissions} variant="outline" className="text-neutral-300 border-neutral-800">
                                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
                            </Button>
                        </div>
                    </div>
                </div>

                <Card className="border-primary/20 bg-background/60 backdrop-blur-md">
                    <CardHeader>
                        <CardTitle>Leaderboard: All Submissions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-10 opacity-50">Loading submissions...</div>
                        ) : submissions.length === 0 ? (
                            <div className="text-center py-10 opacity-50">No submissions found.</div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Team Name</TableHead>
                                        <TableHead>Problem Statement</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">AI Score</TableHead>
                                        <TableHead className="text-right">Details</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {submissions.map((sub) => (
                                        <TableRow key={sub._id?.toString()}>
                                            <TableCell className="font-medium">{sub.team?.name || 'Unknown'}</TableCell>
                                            <TableCell>{sub.team?.problemStatement || 'N/A'}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={sub.status === 'EVALUATED' ? 'default' : 'secondary'}
                                                    className={sub.status === 'EVALUATED' ? 'bg-primary/20 text-primary border-primary/30' : ''}
                                                >
                                                    {sub.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-lg">
                                                {sub.aiEvaluation?.totalScore ? (
                                                    <span className={sub.aiEvaluation.totalScore > 80 ? 'text-green-400' : 'text-primary'}>
                                                        {sub.aiEvaluation.totalScore}
                                                    </span>
                                                ) : '—'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button asChild variant="ghost" size="sm" disabled={sub.status !== 'EVALUATED'}>
                                                    <Link href={`/admin/submission/${sub._id}`}>
                                                        View <ExternalLink className="ml-2 h-4 w-4" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExternalLink, RefreshCw, Download, Search, Trophy, Users, BarChart2, AlertTriangle, Sparkles, Filter } from 'lucide-react';
import Link from 'next/link';

import { ISubmission } from '@/models/Submission';
import { ITeam } from '@/models/Team';

interface ISubmissionWithTeam extends Omit<ISubmission, 'team' | 'hackathon'> {
    team: ITeam;
    hackathon?: { _id: string; name: string; theme: string };
}

interface IHackathonBrief {
    _id: string;
    name: string;
    slug: string;
    theme: string;
    isCodeSubmissionOpen: boolean;
    blindJudgingEnabled: boolean;
}

export default function AdminDashboard() {
    const [submissions, setSubmissions] = useState<ISubmissionWithTeam[]>([]);
    const [hackathons, setHackathons] = useState<IHackathonBrief[]>([]);
    const [selectedHackathonId, setSelectedHackathonId] = useState('ALL');
    const [loading, setLoading] = useState(true);
    const [isCodeSubmissionOpen, setIsCodeSubmissionOpen] = useState(false);
    const [blindJudgingEnabled, setBlindJudgingEnabled] = useState(false);
    const [updatingPhase, setUpdatingPhase] = useState(false);

    // Interactive Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTrack, setSelectedTrack] = useState('ALL');
    const [sortBy, setSortBy] = useState<'SCORE_DESC' | 'SCORE_ASC' | 'NEWEST'>('SCORE_DESC');

    const fetchHackathons = async () => {
        try {
            const res = await fetch('/api/hackathons');
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                setHackathons(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch hackathons:', error);
        }
    };

    const fetchSettings = async (hId: string = selectedHackathonId) => {
        try {
            const url = hId !== 'ALL' ? `/api/settings?hackathonId=${hId}` : '/api/settings';
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                setIsCodeSubmissionOpen(Boolean(data.isCodeSubmissionOpen));
                setBlindJudgingEnabled(Boolean(data.blindJudgingEnabled));
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
                body: JSON.stringify({
                    hackathonId: selectedHackathonId !== 'ALL' ? selectedHackathonId : undefined,
                    isCodeSubmissionOpen: !isCodeSubmissionOpen
                })
            });
            const data = await res.json();
            if (data.success) {
                setIsCodeSubmissionOpen(Boolean(data.isCodeSubmissionOpen));
            }
        } catch (error) {
            console.error('Failed to toggle phase:', error);
        } finally {
            setUpdatingPhase(false);
        }
    };

    const fetchSubmissions = async (hId: string = selectedHackathonId) => {
        setLoading(true);
        try {
            const url = hId !== 'ALL' ? `/api/submissions?hackathonId=${hId}` : '/api/submissions';
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                setSubmissions(data.data || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHackathons();
        fetchSubmissions('ALL');
        fetchSettings('ALL');
    }, []);

    const handleHackathonChange = (hId: string) => {
        setSelectedHackathonId(hId);
        setSelectedTrack('ALL');
        fetchSubmissions(hId);
        fetchSettings(hId);
    };

    // Extract unique tracks
    const uniqueTracks = useMemo(() => {
        const tracks = new Set<string>();
        submissions.forEach((s) => {
            if (s.team?.track) tracks.add(s.team.track);
        });
        return Array.from(tracks);
    }, [submissions]);

    // Computed Analytics
    const stats = useMemo(() => {
        const total = submissions.length;
        if (total === 0) return { total: 0, highest: 0, topTeam: 'N/A', average: 0, plagiarismCount: 0 };

        let highest = 0;
        let topTeam = 'N/A';
        let totalScoreSum = 0;
        let evaluatedCount = 0;
        let plagiarismCount = 0;

        submissions.forEach((sub) => {
            const score = sub.aiEvaluation?.totalScore || 0;
            if (score > highest) {
                highest = score;
                topTeam = sub.team?.name || 'Unknown';
            }
            if (sub.aiEvaluation?.totalScore !== undefined) {
                totalScoreSum += score;
                evaluatedCount++;
            }
            if (sub.aiEvaluation?.plagiarismFlag) {
                plagiarismCount++;
            }
        });

        const average = evaluatedCount > 0 ? Math.round(totalScoreSum / evaluatedCount) : 0;
        return { total, highest, topTeam, average, plagiarismCount };
    }, [submissions]);

    // Filtered & Sorted Submissions
    const filteredSubmissions = useMemo(() => {
        return submissions
            .filter((sub) => {
                const matchesSearch =
                    !searchQuery ||
                    sub.team?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    sub.team?.problemStatement?.toLowerCase().includes(searchQuery.toLowerCase());

                const matchesTrack =
                    selectedTrack === 'ALL' || (sub.team?.track || 'General').toLowerCase() === selectedTrack.toLowerCase();

                return matchesSearch && matchesTrack;
            })
            .sort((a, b) => {
                const scoreA = a.aiEvaluation?.totalScore ?? -1;
                const scoreB = b.aiEvaluation?.totalScore ?? -1;

                if (sortBy === 'SCORE_DESC') return scoreB - scoreA;
                if (sortBy === 'SCORE_ASC') return scoreA - scoreB;
                if (sortBy === 'NEWEST') {
                    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                }
                return 0;
            });
    }, [submissions, searchQuery, selectedTrack, sortBy]);

    return (
        <div className="min-h-screen p-6 md:p-10 relative">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-6xl mx-auto space-y-8 relative z-10">
                {/* Header & Controls */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-2">
                            <Sparkles className="w-3.5 h-3.5" />
                            Live Hackathon Control Center
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">Hackathon Leaderboard</h1>
                        <p className="text-neutral-400 text-sm mt-1">Real-time AI-screened submissions with ranked scores & actionable feedback.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        {/* Hackathon Filter Dropdown */}
                        <div className="flex items-center gap-2 bg-neutral-900/60 p-2 rounded-xl border border-neutral-800">
                            <Trophy className="w-4 h-4 text-primary ml-1 shrink-0" />
                            <select
                                value={selectedHackathonId}
                                onChange={(e) => handleHackathonChange(e.target.value)}
                                className="h-8 px-2 text-xs bg-neutral-950 border border-neutral-700 rounded-md text-white font-medium focus:outline-none focus:ring-1 focus:ring-primary max-w-[180px] truncate"
                            >
                                <option value="ALL">All Hackathons</option>
                                {hackathons.map((h) => (
                                    <option key={h._id} value={h._id}>{h.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-3 bg-neutral-900/60 p-2.5 px-4 rounded-xl border border-neutral-800 backdrop-blur-sm">
                            <div className="text-left">
                                <div className="text-xs font-medium text-white">Phase 2 Code Submission</div>
                                <div className={`text-[11px] font-semibold ${isCodeSubmissionOpen ? 'text-emerald-400' : 'text-neutral-400'}`}>
                                    {isCodeSubmissionOpen ? '● Portal Unlocked' : '○ Locked'}
                                </div>
                            </div>
                            <button
                                onClick={togglePhase}
                                disabled={updatingPhase}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-primary ${isCodeSubmissionOpen ? 'bg-primary' : 'bg-neutral-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isCodeSubmissionOpen ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button asChild variant="outline" size="sm" className="text-primary border-primary/40 bg-primary/10 hover:bg-primary/20">
                                <Link href="/admin/hackathons">
                                    <Trophy className="h-4 w-4 mr-1.5" /> Manage Hackathons
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="sm" className="text-neutral-300 border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800">
                                <a href={`/api/export${selectedHackathonId !== 'ALL' ? `?hackathonId=${selectedHackathonId}` : ''}`} download="hackathon_leaderboard.csv">
                                    <Download className="h-4 w-4 mr-1.5" /> Export CSV
                                </a>
                            </Button>
                            <Button asChild variant="outline" size="sm" className="text-neutral-300 border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800">
                                <Link href="/admin/settings">Settings</Link>
                            </Button>
                            <Button onClick={() => fetchSubmissions(selectedHackathonId)} variant="outline" size="sm" className="text-neutral-300 border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800">
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Stat Overview Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-neutral-900/40 border-neutral-800/80 backdrop-blur-sm">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-xs text-neutral-400 font-medium">Total Teams</span>
                                <h3 className="text-xl font-bold text-white">{stats.total}</h3>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-neutral-900/40 border-neutral-800/80 backdrop-blur-sm">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                                <Trophy className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-xs text-neutral-400 font-medium">Highest Score</span>
                                    <h3 className="text-xl font-bold text-white">
                                        {stats.highest} <span className="text-xs font-normal text-neutral-400">({blindJudgingEnabled ? 'Redacted' : stats.topTeam.slice(0, 10)})</span>
                                    </h3>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-neutral-900/40 border-neutral-800/80 backdrop-blur-sm">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                                <BarChart2 className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-xs text-neutral-400 font-medium">Average Score</span>
                                <h3 className="text-xl font-bold text-white">{stats.average}/100</h3>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-neutral-900/40 border-neutral-800/80 backdrop-blur-sm">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-xs text-neutral-400 font-medium">Plagiarism Alerts</span>
                                <h3 className="text-xl font-bold text-white">{stats.plagiarismCount}</h3>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-neutral-900/40 p-3.5 rounded-xl border border-neutral-800/80 backdrop-blur-sm">
                    <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <Input
                            placeholder="Search team or problem..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-neutral-900/70 border-neutral-800 text-sm h-9 text-white placeholder:text-neutral-500"
                        />
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                            <Filter className="w-3.5 h-3.5" /> Track:
                        </div>
                        <select
                            value={selectedTrack}
                            onChange={(e) => setSelectedTrack(e.target.value)}
                            className="h-9 px-3 text-xs bg-neutral-900/80 border border-neutral-800 rounded-lg text-white"
                        >
                            <option value="ALL">All Tracks</option>
                            <option value="General">General</option>
                            {uniqueTracks.filter((t) => t.toLowerCase() !== 'general').map((t, i) => (
                                <option key={i} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'SCORE_DESC' | 'SCORE_ASC' | 'NEWEST')}
                            className="h-9 px-3 text-xs bg-neutral-900/80 border border-neutral-800 rounded-lg text-white"
                        >
                            <option value="SCORE_DESC">Score (High to Low)</option>
                            <option value="SCORE_ASC">Score (Low to High)</option>
                            <option value="NEWEST">Newest First</option>
                        </select>
                    </div>
                </div>

                {/* Leaderboard Table */}
                <Card className="border-primary/20 bg-background/60 backdrop-blur-md overflow-hidden">
                    <CardHeader className="py-4 border-b border-neutral-800/60 flex flex-row items-center justify-between">
                        <CardTitle className="text-lg font-bold">Ranked Submissions ({filteredSubmissions.length})</CardTitle>
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="text-xs text-primary hover:underline">
                                Clear Search Filter
                            </button>
                        )}
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="text-center py-16 text-neutral-400">
                                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                                Loading leaderboard data...
                            </div>
                        ) : filteredSubmissions.length === 0 ? (
                            <div className="text-center py-16 text-neutral-400">
                                <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                No submissions match your filter.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-neutral-900/40">
                                    <TableRow className="border-neutral-800">
                                        <TableHead className="w-12 text-center">#</TableHead>
                                        <TableHead>Team & Track</TableHead>
                                        <TableHead className="hidden md:table-cell">Problem Statement</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">ATS Score</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSubmissions.map((sub, idx) => {
                                        const score = sub.aiEvaluation?.totalScore;
                                        const isTop3 = idx < 3 && sortBy === 'SCORE_DESC' && !searchQuery;
                                        return (
                                            <TableRow key={sub._id?.toString()} className="border-neutral-800/60 hover:bg-neutral-900/30 transition-colors">
                                                <TableCell className="text-center font-bold text-xs text-neutral-400">
                                                    {isTop3 ? (
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-extrabold">
                                                            {idx + 1}
                                                        </span>
                                                    ) : (
                                                        idx + 1
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-semibold text-white flex items-center gap-2">
                                                        {blindJudgingEnabled ? `Team #${idx + 1} (Redacted)` : (sub.team?.name || 'Unknown Team')}
                                                        {sub.aiEvaluation?.plagiarismFlag && (
                                                            <Badge variant="destructive" className="bg-amber-900/40 text-amber-300 text-[10px] px-1.5 py-0 border-amber-800">
                                                                Cliche Flag
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs text-indigo-400">
                                                            {sub.team?.track || 'General'} Track
                                                        </span>
                                                        {sub.hackathon?.name && (
                                                            <span className="text-[10px] text-neutral-400 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                                                                {sub.hackathon.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell text-xs text-neutral-400 max-w-xs truncate">
                                                    {sub.team?.problemStatement || 'N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={sub.status === 'EVALUATED' ? 'default' : 'secondary'}
                                                        className={sub.status === 'EVALUATED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs' : 'text-xs'}
                                                    >
                                                        {sub.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-lg">
                                                    {score !== undefined ? (
                                                        <span className={score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-primary' : 'text-amber-400'}>
                                                            {score}
                                                            <span className="text-xs text-neutral-500 font-normal">/100</span>
                                                        </span>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button asChild variant="outline" size="sm" className="h-8 text-xs border-neutral-800 hover:bg-neutral-800" disabled={sub.status !== 'EVALUATED'}>
                                                        <Link href={`/admin/submission/${sub._id}`}>
                                                            Scorecard <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

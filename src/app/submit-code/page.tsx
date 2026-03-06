'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Github, Code2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function SubmitCodePage() {
    const [isOpen, setIsOpen] = useState<boolean | null>(null);
    const [teams, setTeams] = useState<{ _id: string, name: string }[]>([]);
    const [selectedTeam, setSelectedTeam] = useState('');
    const [githubUrl, setGithubUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        // Fetch if the phase is open
        fetch('/api/settings').then(res => res.json()).then(data => {
            if (data.success) {
                setIsOpen(data.isCodeSubmissionOpen);
            }
        });

        // Fetch teams that don't have githubURLs yet
        fetch('/api/teams').then(res => res.json()).then(data => {
            if (data.success && data.teams) {
                setTeams(data.teams);
            }
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTeam || !githubUrl) return;

        setIsSubmitting(true);
        setStatus('idle');

        try {
            const res = await fetch('/api/submit-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamId: selectedTeam, githubUrl })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setStatus('success');
                setMessage('Successfully analyzed and linked codebase!');
                setGithubUrl('');
                setSelectedTeam('');
                // Remove team from list
                setTeams(teams.filter(t => t._id !== selectedTeam));
            } else {
                setStatus('error');
                setMessage(data.error || 'Failed to submit code.');
            }
        } catch {
            setStatus('error');
            setMessage('Network error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isOpen === null) {
        return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin text-primary"><Code2 /></div></div>;
    }

    if (isOpen === false) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md shadow-2xl border-primary/20 bg-background/60 backdrop-blur-xl relative z-10 text-center">
                    <CardHeader className="pb-6">
                        <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                            <AlertTriangle className="w-8 h-8 text-yellow-500" />
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight text-white mb-2">Phase Locked</CardTitle>
                        <CardDescription className="text-neutral-400">
                            The Code Submission phase for this hackathon is currently closed by the organizers.
                            Please wait for the judges to unlock this portal after initial screening.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/">
                            <Button variant="outline" className="w-full border-neutral-800 text-neutral-300">Return Home</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 blur-[120px] pointer-events-none rounded-full" />

            <Card className="w-full max-w-md shadow-2xl border-primary/20 bg-background/60 backdrop-blur-xl relative z-10">
                <CardHeader className="text-center pb-6">
                    <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                        <Github className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-white">Submit Codebase</CardTitle>
                    <CardDescription className="text-neutral-400">
                        Link your GitHub repository to generate your Technical Complexity score.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2 flex flex-col">
                            <Label htmlFor="team" className="text-white">Select Your Team</Label>
                            <select
                                id="team"
                                value={selectedTeam}
                                onChange={e => setSelectedTeam(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-neutral-800 bg-neutral-900/50 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                required
                            >
                                <option value="" disabled>Choose team...</option>
                                {teams.map(team => (
                                    <option key={team._id} value={team._id}>{team.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2 flex flex-col">
                            <Label htmlFor="githubUrl" className="text-white">Public Repository URL</Label>
                            <Input
                                id="githubUrl"
                                type="url"
                                placeholder="https://github.com/team/project"
                                value={githubUrl}
                                onChange={(e) => setGithubUrl(e.target.value)}
                                className="bg-neutral-900/50 border-neutral-800 text-white"
                                required
                            />
                        </div>

                        {status === 'error' && (
                            <div className="p-3 bg-red-900/30 border border-red-900/50 rounded-md text-red-200 text-sm text-center">
                                {message}
                            </div>
                        )}

                        {status === 'success' && (
                            <div className="p-3 bg-green-900/30 border border-green-900/50 rounded-md text-green-200 text-sm text-center flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-4 h-4" /> {message}
                            </div>
                        )}

                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? 'Analyzing Codebase...' : 'Submit Code for Review'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

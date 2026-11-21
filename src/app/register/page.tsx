'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, User, Trophy, Plus, Trash2, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface IHackathon {
    _id: string;
    name: string;
    theme: string;
    description: string;
    tracks: { name: string; requiredSlides?: string[] }[];
}

interface IMemberInput {
    name: string;
    email: string;
    college: string;
}

export default function RegisterTeamPage() {
    const router = useRouter();
    const [hackathons, setHackathons] = useState<IHackathon[]>([]);
    const [selectedHackathonId, setSelectedHackathonId] = useState('');
    const [loadingHackathons, setLoadingHackathons] = useState(true);

    // Form Fields - Leader
    const [leaderName, setLeaderName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [leaderPhone, setLeaderPhone] = useState('');
    const [college, setCollege] = useState('');

    // Form Fields - Team & Project
    const [teamName, setTeamName] = useState('');
    const [track, setTrack] = useState('');
    const [projectTitle, setProjectTitle] = useState('');
    const [problemStatement, setProblemStatement] = useState('');
    const [solutionDescription, setSolutionDescription] = useState('');

    // Form Fields - Members
    const [members, setMembers] = useState<IMemberInput[]>([
        { name: '', email: '', college: '' }
    ]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/hackathons')
            .then(res => res.json())
            .then(data => {
                if (data.success && Array.isArray(data.data) && data.data.length > 0) {
                    setHackathons(data.data);
                    const first = data.data[0];
                    setSelectedHackathonId(first._id);
                    if (first.tracks && first.tracks.length > 0) {
                        setTrack(first.tracks[0].name);
                    }
                }
            })
            .catch(console.error)
            .finally(() => setLoadingHackathons(false));
    }, []);

    const selectedHackathon = hackathons.find(h => h._id === selectedHackathonId) || hackathons[0];

    const handleHackathonChange = (hId: string) => {
        setSelectedHackathonId(hId);
        const found = hackathons.find(h => h._id === hId);
        if (found && found.tracks && found.tracks.length > 0) {
            setTrack(found.tracks[0].name);
        } else {
            setTrack('');
        }
    };

    const addMember = () => {
        if (members.length >= 6) return;
        setMembers([...members, { name: '', email: '', college: college || '' }]);
    };

    const updateMember = (index: number, field: keyof IMemberInput, val: string) => {
        const updated = [...members];
        updated[index][field] = val;
        setMembers(updated);
    };

    const removeMember = (index: number) => {
        setMembers(members.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teamName,
                    leaderName,
                    email,
                    password,
                    leaderPhone,
                    college,
                    hackathonId: selectedHackathonId,
                    track,
                    projectTitle,
                    problemStatement,
                    solutionDescription,
                    members
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Registration failed.');
                setIsSubmitting(false);
                return;
            }

            // Automatically sign in the newly registered leader
            const signInRes = await signIn('credentials', {
                redirect: false,
                email,
                password
            });

            if (signInRes?.ok) {
                router.push('/dashboard');
                router.refresh();
            } else {
                router.push('/login?registered=true');
            }

        } catch (err) {
            console.error(err);
            setError('A network error occurred. Please try again.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen py-10 px-4 max-w-4xl mx-auto relative">
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="space-y-6 relative z-10">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
                        <Sparkles className="w-3.5 h-3.5" />
                        Official Hackathon Registration
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white">Register Your Hackathon Team</h1>
                    <p className="text-neutral-400 text-sm max-w-xl mx-auto">
                        Create your verified team leader account to submit pitch decks, receive AI feedback, and qualify for the leaderboard.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Step 1: Hackathon & Theme Selection */}
                    <Card className="border-primary/20 bg-background/60 backdrop-blur-md">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-bold flex items-center gap-2 text-white">
                                <Trophy className="w-4 h-4 text-primary" /> 1. Hackathon & Theme Selection
                            </CardTitle>
                            <CardDescription>Select the event and track your team is competing in</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loadingHackathons ? (
                                <p className="text-xs text-neutral-400">Loading active hackathons...</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="hackathonSelect">Event</Label>
                                        <select
                                            id="hackathonSelect"
                                            value={selectedHackathonId}
                                            onChange={(e) => handleHackathonChange(e.target.value)}
                                            className="w-full h-10 px-3 text-sm bg-neutral-900 border border-neutral-700 rounded-md text-white font-medium focus:ring-1 focus:ring-primary"
                                        >
                                            {hackathons.map(h => (
                                                <option key={h._id} value={h._id}>{h.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="trackSelect">Theme / Track</Label>
                                        <select
                                            id="trackSelect"
                                            value={track}
                                            onChange={(e) => setTrack(e.target.value)}
                                            className="w-full h-10 px-3 text-sm bg-neutral-900 border border-neutral-700 rounded-md text-white font-medium focus:ring-1 focus:ring-primary"
                                        >
                                            {selectedHackathon?.tracks?.map((t, idx) => (
                                                <option key={idx} value={t.name}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {selectedHackathon?.theme && (
                                <div className="p-3 bg-neutral-900/80 rounded-lg border border-neutral-800 text-xs text-neutral-300">
                                    <span className="font-semibold text-primary">Theme Brief: </span>
                                    {selectedHackathon.theme}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Step 2: Team Leader Account */}
                    <Card className="border-primary/20 bg-background/60 backdrop-blur-md">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-bold flex items-center gap-2 text-white">
                                <User className="w-4 h-4 text-primary" /> 2. Team Leader Identity
                            </CardTitle>
                            <CardDescription>This account owns the submission and receives evaluation scorecards</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="leaderName">Full Name *</Label>
                                    <Input
                                        id="leaderName"
                                        placeholder="Alex Johnson"
                                        value={leaderName}
                                        onChange={(e) => setLeaderName(e.target.value)}
                                        required
                                        className="bg-neutral-900/80 border-neutral-800"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address (Login ID) *</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="alex@university.edu"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="bg-neutral-900/80 border-neutral-800"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Account Password *</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Minimum 6 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        className="bg-neutral-900/80 border-neutral-800"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="leaderPhone">Contact Phone Number</Label>
                                    <Input
                                        id="leaderPhone"
                                        type="tel"
                                        placeholder="+1 (555) 000-0000"
                                        value={leaderPhone}
                                        onChange={(e) => setLeaderPhone(e.target.value)}
                                        className="bg-neutral-900/80 border-neutral-800"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="college">College / University / Organization</Label>
                                    <Input
                                        id="college"
                                        placeholder="e.g. Stanford University or Open Source Contributor"
                                        value={college}
                                        onChange={(e) => setCollege(e.target.value)}
                                        className="bg-neutral-900/80 border-neutral-800"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Step 3: Team & Project Scope */}
                    <Card className="border-primary/20 bg-background/60 backdrop-blur-md">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-bold flex items-center gap-2 text-white">
                                <Users className="w-4 h-4 text-primary" /> 3. Team & Project Scope
                            </CardTitle>
                            <CardDescription>Enter your project concept and problem description</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="teamName">Official Team Name *</Label>
                                    <Input
                                        id="teamName"
                                        placeholder="NeuralNexus"
                                        value={teamName}
                                        onChange={(e) => setTeamName(e.target.value)}
                                        required
                                        className="bg-neutral-900/80 border-neutral-800"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="projectTitle">Project Title</Label>
                                    <Input
                                        id="projectTitle"
                                        placeholder="Autonomous Agent for Clinical Records"
                                        value={projectTitle}
                                        onChange={(e) => setProjectTitle(e.target.value)}
                                        className="bg-neutral-900/80 border-neutral-800"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="problemStatement">Problem Statement *</Label>
                                <textarea
                                    id="problemStatement"
                                    rows={3}
                                    placeholder="Describe the critical real-world problem your project addresses..."
                                    value={problemStatement}
                                    onChange={(e) => setProblemStatement(e.target.value)}
                                    required
                                    className="w-full p-3 rounded-md bg-neutral-900/80 border border-neutral-800 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="solutionDescription">Solution Description & Architecture</Label>
                                <textarea
                                    id="solutionDescription"
                                    rows={2}
                                    placeholder="Brief outline of your solution architecture and tech stack..."
                                    value={solutionDescription}
                                    onChange={(e) => setSolutionDescription(e.target.value)}
                                    className="w-full p-3 rounded-md bg-neutral-900/80 border border-neutral-800 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Step 4: Team Members Roster */}
                    <Card className="border-primary/20 bg-background/60 backdrop-blur-md">
                        <CardHeader className="pb-4 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white">
                                    <Users className="w-4 h-4 text-primary" /> 4. Additional Team Members
                                </CardTitle>
                                <CardDescription>Add co-developers or designers on your team</CardDescription>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addMember}
                                disabled={members.length >= 5}
                                className="border-primary/30 text-primary hover:bg-primary/10"
                            >
                                <Plus className="w-3.5 h-3.5 mr-1" /> Add Member
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {members.map((m, idx) => (
                                <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 bg-neutral-900/50 rounded-lg border border-neutral-800">
                                    <Badge variant="outline" className="text-xs shrink-0 border-neutral-700">
                                        Member {idx + 1}
                                    </Badge>
                                    <Input
                                        placeholder="Full Name"
                                        value={m.name}
                                        onChange={(e) => updateMember(idx, 'name', e.target.value)}
                                        className="h-8 text-xs bg-neutral-950 border-neutral-800 flex-1"
                                    />
                                    <Input
                                        placeholder="Email (optional)"
                                        type="email"
                                        value={m.email}
                                        onChange={(e) => updateMember(idx, 'email', e.target.value)}
                                        className="h-8 text-xs bg-neutral-950 border-neutral-800 flex-1"
                                    />
                                    <Input
                                        placeholder="College / Role"
                                        value={m.college}
                                        onChange={(e) => updateMember(idx, 'college', e.target.value)}
                                        className="h-8 text-xs bg-neutral-950 border-neutral-800 flex-1"
                                    />
                                    {members.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeMember(idx)}
                                            className="text-neutral-500 hover:text-red-400 p-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-medium text-center">
                            {error}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                        <p className="text-xs text-neutral-400">
                            Already registered?{' '}
                            <Link href="/login" className="text-primary hover:underline font-medium">
                                Sign In to Dashboard
                            </Link>
                        </p>

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-black font-bold px-8 h-11"
                        >
                            {isSubmitting ? (
                                'Registering Team...'
                            ) : (
                                <>
                                    Complete Team Registration <ArrowRight className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

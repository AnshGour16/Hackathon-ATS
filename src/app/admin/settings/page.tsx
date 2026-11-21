'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Plus, Trash2, EyeOff, Trophy } from 'lucide-react';
import Link from 'next/link';

interface IRubric {
    criterion: string;
    weightage: number;
    description: string;
}

interface ITrack {
    name: string;
    requiredSlides: string[];
    rubrics: IRubric[];
}

export default function AdminSettings() {
    const [blindJudgingEnabled, setBlindJudgingEnabled] = useState(false);
    const [tracks, setTracks] = useState<ITrack[]>([]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/settings');
                const data = await res.json();
                if (data.success) {
                    setBlindJudgingEnabled(data.blindJudgingEnabled || false);
                    setTracks(data.tracks || []);
                }
            } catch (error) {
                console.error('Failed to fetch settings:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const saveSettings = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ blindJudgingEnabled, tracks })
            });
            if (res.ok) alert('Settings saved successfully!');
            else alert('Failed to save settings.');
        } catch (error) {
            console.error(error);
            alert('Error saving settings.');
        } finally {
            setSaving(false);
        }
    };

    const addTrack = () => {
        setTracks([...tracks, { name: '', requiredSlides: [], rubrics: [] }]);
    };

    const updateTrackName = (index: number, name: string) => {
        const newTracks = [...tracks];
        newTracks[index].name = name;
        setTracks(newTracks);
    };

    const removeTrack = (index: number) => {
        setTracks(tracks.filter((_, i) => i !== index));
    };

    // Slides
    const addRequiredSlide = (trackIndex: number) => {
        const newTracks = [...tracks];
        newTracks[trackIndex].requiredSlides.push('');
        setTracks(newTracks);
    };

    const updateRequiredSlide = (trackIndex: number, slideIndex: number, val: string) => {
        const newTracks = [...tracks];
        newTracks[trackIndex].requiredSlides[slideIndex] = val;
        setTracks(newTracks);
    };

    const removeRequiredSlide = (trackIndex: number, slideIndex: number) => {
        const newTracks = [...tracks];
        newTracks[trackIndex].requiredSlides.splice(slideIndex, 1);
        setTracks(newTracks);
    };

    // Rubrics
    const addRubric = (trackIndex: number) => {
        const newTracks = [...tracks];
        newTracks[trackIndex].rubrics.push({ criterion: '', weightage: 10, description: '' });
        setTracks(newTracks);
    };

    const updateRubric = (trackIndex: number, rubricIndex: number, field: keyof IRubric, value: string | number) => {
        const newTracks = [...tracks];
        newTracks[trackIndex].rubrics[rubricIndex] = {
            ...newTracks[trackIndex].rubrics[rubricIndex],
            [field]: value
        };
        setTracks(newTracks);
    };

    const removeRubric = (trackIndex: number, rubricIndex: number) => {
        const newTracks = [...tracks];
        newTracks[trackIndex].rubrics.splice(rubricIndex, 1);
        setTracks(newTracks);
    };

    if (loading) return <div className="min-h-screen pt-20 text-center text-white">Loading...</div>;

    return (
        <div className="min-h-screen p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button asChild variant="outline" size="icon">
                            <Link href="/admin"><ArrowLeft className="h-4 w-4" /></Link>
                        </Button>
                        <h1 className="text-3xl font-bold tracking-tight text-white">Advanced Settings</h1>
                    </div>
                    <Button onClick={saveSettings} disabled={saving} className="bg-primary hover:bg-primary/90">
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Settings'}
                    </Button>
                </div>

                <Card className="border-indigo-500/30 bg-indigo-950/20 backdrop-blur-md">
                    <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                            <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-indigo-400" /> Multi-Hackathon Hub
                            </h3>
                            <p className="text-xs text-neutral-400 mt-0.5">
                                Set up distinct hackathons, themes, rules, and tailored AI judging prompts per event.
                            </p>
                        </div>
                        <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0">
                            <Link href="/admin/hackathons">Manage Hackathons Hub</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border-primary/20 bg-background/60 backdrop-blur-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <EyeOff className="w-5 h-5 text-indigo-400" /> &quot;Blind&quot; Judging Mode
                        </CardTitle>
                        <CardDescription>
                            Hide team member names, roll numbers, and exact repository URLs from human judges to prevent bias.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <label className="flex items-center space-x-3 cursor-pointer p-4 border border-neutral-800 rounded-lg hover:bg-neutral-900/50 transition-colors">
                            <input
                                type="checkbox"
                                checked={blindJudgingEnabled}
                                onChange={(e) => setBlindJudgingEnabled(e.target.checked)}
                                className="w-5 h-5 accent-indigo-500 rounded bg-neutral-800 border-neutral-700"
                            />
                            <span className="text-white font-medium">Enable Blind Judging</span>
                        </label>
                    </CardContent>
                </Card>

                <div className="flex items-center justify-between mt-8">
                    <h2 className="text-2xl font-bold tracking-tight text-white">Hackathon Tracks & Rubrics</h2>
                    <Button onClick={addTrack} variant="outline" className="text-primary border-primary hover:bg-primary/10">
                        <Plus className="w-4 h-4 mr-2" /> Add Track
                    </Button>
                </div>

                {tracks.map((track, tIdx) => (
                    <Card key={tIdx} className="border-neutral-800 bg-background/60 backdrop-blur-md">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div className="flex-1 mr-4">
                                <Label className="text-neutral-400">Track Name</Label>
                                <Input
                                    value={track.name}
                                    placeholder="e.g. Web3, Healthcare, General"
                                    onChange={(e) => updateTrackName(tIdx, e.target.value)}
                                    className="text-lg font-bold mt-1 bg-neutral-900/50"
                                />
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeTrack(tIdx)} className="text-red-400 hover:text-red-300 hover:bg-red-900/20 mt-6">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            {/* Required Slides Section */}
                            <div className="p-4 bg-neutral-900/30 rounded-lg border border-neutral-800">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold text-white">Mandatory Slides</h3>
                                    <Button onClick={() => addRequiredSlide(tIdx)} size="sm" variant="ghost" className="h-8">
                                        <Plus className="w-4 h-4 mr-1" /> Add requirement
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {track.requiredSlides.map((slide, sIdx) => (
                                        <div key={sIdx} className="flex gap-2">
                                            <Input
                                                value={slide}
                                                placeholder="e.g. Revenue Model, Architecture Diagram"
                                                onChange={(e) => updateRequiredSlide(tIdx, sIdx, e.target.value)}
                                                className="bg-neutral-900/80"
                                            />
                                            <Button variant="ghost" size="icon" onClick={() => removeRequiredSlide(tIdx, sIdx)} className="text-neutral-400">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {track.requiredSlides.length === 0 && <p className="text-sm text-neutral-500">No mandatory slides defined.</p>}
                                </div>
                            </div>

                            {/* Custom Rubrics Section */}
                            <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold text-white">Scoring Rubric (Criteria)</h3>
                                    <Button onClick={() => addRubric(tIdx)} size="sm" variant="ghost" className="h-8 text-primary hover:text-primary">
                                        <Plus className="w-4 h-4 mr-1" /> Add Criterion
                                    </Button>
                                </div>
                                <div className="space-y-4">
                                    {track.rubrics.map((rubric, rIdx) => (
                                        <div key={rIdx} className="grid grid-cols-[1fr_80px_auto] gap-4 items-start border-l-2 border-primary/20 pl-4 py-2">
                                            <div className="space-y-2">
                                                <Label className="text-xs">Criterion Name</Label>
                                                <Input
                                                    value={rubric.criterion}
                                                    onChange={(e) => updateRubric(tIdx, rIdx, 'criterion', e.target.value)}
                                                    placeholder="e.g. Innovation"
                                                    className="h-8 text-sm"
                                                />
                                                <Label className="text-xs">Description (For AI to understand)</Label>
                                                <Input
                                                    value={rubric.description}
                                                    onChange={(e) => updateRubric(tIdx, rIdx, 'description', e.target.value)}
                                                    placeholder="Explain what exactly the AI should look for..."
                                                    className="h-8 text-sm text-neutral-400"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs">Weight</Label>
                                                <Input
                                                    type="number"
                                                    value={rubric.weightage}
                                                    onChange={(e) => updateRubric(tIdx, rIdx, 'weightage', parseInt(e.target.value) || 0)}
                                                    className="h-8 text-sm text-center"
                                                />
                                            </div>
                                            <div className="pt-6">
                                                <Button variant="ghost" size="icon" onClick={() => removeRubric(tIdx, rIdx)} className="text-red-400">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {track.rubrics.length === 0 && <p className="text-sm text-neutral-500">No scoring criteria defined.</p>}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

            </div>
        </div>
    );
}

'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft, Plus, Trash2, Edit3, Sparkles, Target,
    FileText, Bot, Trophy, Layers
} from 'lucide-react';
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

interface IHackathon {
    _id: string;
    name: string;
    slug: string;
    description: string;
    theme: string;
    customAiPrompt: string;
    isCodeSubmissionOpen: boolean;
    blindJudgingEnabled: boolean;
    tracks: ITrack[];
    createdAt?: string;
}

export default function HackathonsManagementPage() {
    const [hackathons, setHackathons] = useState<IHackathon[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Form fields
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [theme, setTheme] = useState('');
    const [description, setDescription] = useState('');
    const [customAiPrompt, setCustomAiPrompt] = useState('');
    const [isCodeSubmissionOpen, setIsCodeSubmissionOpen] = useState(false);
    const [blindJudgingEnabled, setBlindJudgingEnabled] = useState(false);
    const [tracks, setTracks] = useState<ITrack[]>([
        {
            name: 'General',
            requiredSlides: ['Problem Statement', 'Solution Architecture', 'Tech Stack'],
            rubrics: [
                { criterion: 'Innovation', weightage: 10, description: 'Originality and uniqueness' },
                { criterion: 'Technical Feasibility', weightage: 10, description: 'Architecture & practical execution' },
                { criterion: 'Completeness', weightage: 10, description: 'MVP implementation depth' }
            ]
        }
    ]);

    const fetchHackathons = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/hackathons');
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                setHackathons(data.data);
            }
        } catch (e) {
            console.error('Failed to fetch hackathons:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHackathons();
    }, []);

    const resetForm = () => {
        setName('');
        setSlug('');
        setTheme('');
        setDescription('');
        setCustomAiPrompt('');
        setIsCodeSubmissionOpen(false);
        setBlindJudgingEnabled(false);
        setTracks([
            {
                name: 'General',
                requiredSlides: ['Problem Statement', 'Solution Architecture', 'Tech Stack'],
                rubrics: [
                    { criterion: 'Innovation', weightage: 10, description: 'Originality and uniqueness' },
                    { criterion: 'Technical Feasibility', weightage: 10, description: 'Architecture & practical execution' },
                    { criterion: 'Completeness', weightage: 10, description: 'MVP implementation depth' }
                ]
            }
        ]);
        setEditingId(null);
        setIsFormOpen(false);
    };

    const handleEdit = (h: IHackathon) => {
        setEditingId(h._id);
        setName(h.name || '');
        setSlug(h.slug || '');
        setTheme(h.theme || '');
        setDescription(h.description || '');
        setCustomAiPrompt(h.customAiPrompt || '');
        setIsCodeSubmissionOpen(Boolean(h.isCodeSubmissionOpen));
        setBlindJudgingEnabled(Boolean(h.blindJudgingEnabled));
        setTracks(h.tracks && h.tracks.length > 0 ? JSON.parse(JSON.stringify(h.tracks)) : []);
        setIsFormOpen(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            alert('Hackathon name is required.');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name,
                slug,
                theme,
                description,
                customAiPrompt,
                isCodeSubmissionOpen,
                blindJudgingEnabled,
                tracks
            };

            const url = editingId ? `/api/hackathons/${editingId}` : '/api/hackathons';
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok && data.success) {
                alert(editingId ? 'Hackathon updated successfully!' : 'Hackathon created successfully!');
                resetForm();
                fetchHackathons();
            } else {
                alert(data.error || 'Failed to save hackathon.');
            }
        } catch (e) {
            console.error(e);
            alert('Network error while saving hackathon.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, hName: string) => {
        if (!confirm(`Are you sure you want to delete "${hName}"?`)) return;

        try {
            const res = await fetch(`/api/hackathons/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok && data.success) {
                fetchHackathons();
            } else {
                alert(data.error || 'Failed to delete hackathon.');
            }
        } catch (e) {
            console.error(e);
            alert('Network error while deleting hackathon.');
        }
    };

    // Track manipulation helpers
    const addTrack = () => {
        setTracks([...tracks, { name: '', requiredSlides: [], rubrics: [{ criterion: '', weightage: 10, description: '' }] }]);
    };

    const updateTrackName = (tIdx: number, val: string) => {
        const next = [...tracks];
        next[tIdx].name = val;
        setTracks(next);
    };

    const removeTrack = (tIdx: number) => {
        setTracks(tracks.filter((_, i) => i !== tIdx));
    };

    const addRequiredSlide = (tIdx: number) => {
        const next = [...tracks];
        next[tIdx].requiredSlides.push('');
        setTracks(next);
    };

    const updateRequiredSlide = (tIdx: number, sIdx: number, val: string) => {
        const next = [...tracks];
        next[tIdx].requiredSlides[sIdx] = val;
        setTracks(next);
    };

    const removeRequiredSlide = (tIdx: number, sIdx: number) => {
        const next = [...tracks];
        next[tIdx].requiredSlides.splice(sIdx, 1);
        setTracks(next);
    };

    const addRubric = (tIdx: number) => {
        const next = [...tracks];
        next[tIdx].rubrics.push({ criterion: '', weightage: 10, description: '' });
        setTracks(next);
    };

    const updateRubric = (tIdx: number, rIdx: number, field: keyof IRubric, val: string | number) => {
        const next = [...tracks];
        next[tIdx].rubrics[rIdx] = { ...next[tIdx].rubrics[rIdx], [field]: val };
        setTracks(next);
    };

    const removeRubric = (tIdx: number, rIdx: number) => {
        const next = [...tracks];
        next[tIdx].rubrics.splice(rIdx, 1);
        setTracks(next);
    };

    return (
        <div className="min-h-screen p-6 md:p-10 relative">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-6xl mx-auto space-y-8 relative z-10">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Button asChild variant="outline" size="icon" className="border-neutral-800 bg-neutral-900/50">
                            <Link href="/admin"><ArrowLeft className="h-4 w-4" /></Link>
                        </Button>
                        <div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-1">
                                <Trophy className="w-3.5 h-3.5" /> Multi-Hackathon Hub
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-white">Manage Hackathons</h1>
                            <p className="text-neutral-400 text-sm">Configure distinct themes, descriptions, tracks, and tailored AI judging prompts per event.</p>
                        </div>
                    </div>

                    {!isFormOpen && (
                        <Button onClick={() => setIsFormOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                            <Plus className="w-4 h-4 mr-2" /> Create New Hackathon
                        </Button>
                    )}
                </div>

                {/* Create / Edit Form */}
                {isFormOpen && (
                    <Card className="border-primary/30 bg-background/80 backdrop-blur-xl animate-in slide-in-from-top-4 duration-300">
                        <CardHeader className="border-b border-neutral-800/80 pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-primary" />
                                        {editingId ? 'Edit Hackathon Configuration' : 'Create New Hackathon'}
                                    </CardTitle>
                                    <CardDescription>
                                        Define event themes, rules, track rubrics, and the exact custom AI prompt Gemini will use to score submissions.
                                    </CardDescription>
                                </div>
                                <Button variant="ghost" size="sm" onClick={resetForm} className="text-neutral-400 hover:text-white">
                                    Cancel
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form onSubmit={handleSave} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="hName" className="font-semibold text-white">Hackathon Name *</Label>
                                        <Input
                                            id="hName"
                                            required
                                            placeholder="e.g. AI Agents & Climate Sprint 2026"
                                            value={name}
                                            onChange={(e) => {
                                                setName(e.target.value);
                                                if (!editingId && !slug) {
                                                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
                                                }
                                            }}
                                            className="bg-neutral-900/60 border-neutral-800 text-white"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="hSlug" className="font-semibold text-white">URL Identifier / Slug</Label>
                                        <Input
                                            id="hSlug"
                                            placeholder="e.g. ai-climate-2026"
                                            value={slug}
                                            onChange={(e) => setSlug(e.target.value)}
                                            className="bg-neutral-900/60 border-neutral-800 text-white font-mono text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="hTheme" className="font-semibold text-white flex items-center gap-2">
                                        <Target className="w-4 h-4 text-indigo-400" /> Hackathon Theme *
                                    </Label>
                                    <Input
                                        id="hTheme"
                                        required
                                        placeholder="e.g. Autonomous Multi-Agent Orchestration & Sustainable Green Computing"
                                        value={theme}
                                        onChange={(e) => setTheme(e.target.value)}
                                        className="bg-neutral-900/60 border-neutral-800 text-white"
                                    />
                                    <p className="text-xs text-neutral-400">
                                        The overarching theme used by Gemini to judge problem-solution fit and contextual relevance.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="hDesc" className="font-semibold text-white flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-emerald-400" /> Description & Event Overview
                                    </Label>
                                    <textarea
                                        id="hDesc"
                                        rows={3}
                                        placeholder="Explain the hackathon goals, problem space, target audience, and expectations..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full rounded-md border border-neutral-800 bg-neutral-900/60 p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>

                                {/* Custom AI Prompt Section */}
                                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2.5">
                                    <div className="flex items-center gap-2">
                                        <Bot className="w-5 h-5 text-primary" />
                                        <Label htmlFor="hPrompt" className="text-sm font-bold text-white">
                                            Specific AI Judging Prompt & Guidelines
                                        </Label>
                                    </div>
                                    <p className="text-xs text-neutral-300 leading-relaxed">
                                        Customize the exact instructions Gemini 2.5 Flash will use when reviewing presentations for this hackathon. Mention special criteria, penalty rules (e.g. penalize generic chatbot wrappers), or required architectural patterns.
                                    </p>
                                    <textarea
                                        id="hPrompt"
                                        rows={4}
                                        placeholder="e.g. Scrutinize the technical architecture for genuine multi-agent coordination. Strongly penalize thin wrappers around OpenAI APIs. Reward real-world viability, low latency, and energy-efficient inference..."
                                        value={customAiPrompt}
                                        onChange={(e) => setCustomAiPrompt(e.target.value)}
                                        className="w-full rounded-md border border-primary/30 bg-neutral-950 p-3 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary font-mono text-xs leading-relaxed"
                                    />
                                </div>

                                {/* Phase Toggles */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    <label className="flex items-center gap-3 p-3.5 rounded-lg border border-neutral-800 bg-neutral-900/40 cursor-pointer hover:bg-neutral-900/70 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={isCodeSubmissionOpen}
                                            onChange={(e) => setIsCodeSubmissionOpen(e.target.checked)}
                                            className="w-4 h-4 accent-primary rounded"
                                        />
                                        <div>
                                            <div className="text-sm font-semibold text-white">Phase 2: Code Submission Open</div>
                                            <div className="text-xs text-neutral-400">Unlock GitHub repo submissions for participants</div>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-3 p-3.5 rounded-lg border border-neutral-800 bg-neutral-900/40 cursor-pointer hover:bg-neutral-900/70 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={blindJudgingEnabled}
                                            onChange={(e) => setBlindJudgingEnabled(e.target.checked)}
                                            className="w-4 h-4 accent-primary rounded"
                                        />
                                        <div>
                                            <div className="text-sm font-semibold text-white">Blind Judging Mode</div>
                                            <div className="text-xs text-neutral-400">Redact team names & identities on leaderboards</div>
                                        </div>
                                    </label>
                                </div>

                                {/* Tracks & Rubrics */}
                                <div className="space-y-4 pt-4 border-t border-neutral-800">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                <Layers className="w-5 h-5 text-indigo-400" /> Tracks & Scoring Rubrics
                                            </h3>
                                            <p className="text-xs text-neutral-400">Add custom categories, mandatory slides, and weighted scoring criteria.</p>
                                        </div>
                                        <Button type="button" onClick={addTrack} variant="outline" size="sm" className="border-primary/40 text-primary hover:bg-primary/10">
                                            <Plus className="w-4 h-4 mr-1" /> Add Track
                                        </Button>
                                    </div>

                                    {tracks.map((track, tIdx) => (
                                        <Card key={tIdx} className="border-neutral-800 bg-neutral-950/60">
                                            <CardHeader className="flex flex-row items-center justify-between pb-3">
                                                <div className="flex-1 mr-4">
                                                    <Label className="text-xs text-neutral-400">Track Name</Label>
                                                    <Input
                                                        value={track.name}
                                                        placeholder="e.g. Web3, Healthcare, FinTech"
                                                        onChange={(e) => updateTrackName(tIdx, e.target.value)}
                                                        className="h-8 text-sm font-semibold mt-1 bg-neutral-900/70"
                                                    />
                                                </div>
                                                {tracks.length > 1 && (
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeTrack(tIdx)} className="text-red-400 hover:bg-red-900/20">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </CardHeader>
                                            <CardContent className="space-y-4 pt-0">
                                                {/* Mandatory Slides */}
                                                <div className="p-3 bg-neutral-900/30 rounded-lg border border-neutral-800/80">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-semibold text-neutral-300">Mandatory Slides / Sections</span>
                                                        <Button type="button" onClick={() => addRequiredSlide(tIdx)} size="sm" variant="ghost" className="h-6 text-xs text-primary">
                                                            <Plus className="w-3 h-3 mr-1" /> Add Slide Rule
                                                        </Button>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {track.requiredSlides.map((slide, sIdx) => (
                                                            <div key={sIdx} className="flex gap-2">
                                                                <Input
                                                                    value={slide}
                                                                    placeholder="e.g. Revenue Model, Architecture Diagram"
                                                                    onChange={(e) => updateRequiredSlide(tIdx, sIdx, e.target.value)}
                                                                    className="h-8 text-xs bg-neutral-900/80"
                                                                />
                                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeRequiredSlide(tIdx, sIdx)} className="h-8 w-8 text-neutral-400">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                        {track.requiredSlides.length === 0 && (
                                                            <p className="text-xs text-neutral-500 italic">No mandatory slides defined.</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Scoring Rubrics */}
                                                <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-semibold text-neutral-300">Scoring Rubrics (AI Criteria)</span>
                                                        <Button type="button" onClick={() => addRubric(tIdx)} size="sm" variant="ghost" className="h-6 text-xs text-primary">
                                                            <Plus className="w-3 h-3 mr-1" /> Add Criterion
                                                        </Button>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {track.rubrics.map((rubric, rIdx) => (
                                                            <div key={rIdx} className="grid grid-cols-[1fr_80px_auto] gap-2 items-start border-l-2 border-primary/20 pl-3 py-1">
                                                                <div className="space-y-1">
                                                                    <Input
                                                                        value={rubric.criterion}
                                                                        onChange={(e) => updateRubric(tIdx, rIdx, 'criterion', e.target.value)}
                                                                        placeholder="Criterion Name (e.g. AI Novelty)"
                                                                        className="h-7 text-xs font-semibold"
                                                                    />
                                                                    <Input
                                                                        value={rubric.description}
                                                                        onChange={(e) => updateRubric(tIdx, rIdx, 'description', e.target.value)}
                                                                        placeholder="What AI should evaluate for this criterion..."
                                                                        className="h-7 text-xs text-neutral-400"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Input
                                                                        type="number"
                                                                        value={rubric.weightage}
                                                                        onChange={(e) => updateRubric(tIdx, rIdx, 'weightage', parseInt(e.target.value) || 10)}
                                                                        className="h-7 text-xs text-center"
                                                                    />
                                                                </div>
                                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeRubric(tIdx, rIdx)} className="h-7 w-7 text-red-400">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                                    <Button type="button" variant="outline" onClick={resetForm} disabled={saving} className="border-neutral-800">
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                                        {saving ? 'Saving...' : editingId ? 'Update Hackathon' : 'Create Hackathon'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* List of Hackathons */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white">Configured Hackathons ({hackathons.length})</h2>
                    </div>

                    {loading ? (
                        <div className="text-center py-12 text-neutral-400">Loading hackathon configurations...</div>
                    ) : hackathons.length === 0 ? (
                        <div className="text-center py-12 text-neutral-400">No hackathons configured yet. Click above to create one.</div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {hackathons.map((h) => (
                                <Card key={h._id} className="border-neutral-800/80 bg-neutral-900/40 backdrop-blur-sm hover:border-primary/30 transition-all">
                                    <CardContent className="p-6">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                            <div className="space-y-2 flex-1">
                                                <div className="flex flex-wrap items-center gap-2.5">
                                                    <h3 className="text-xl font-bold text-white">{h.name}</h3>
                                                    <Badge variant="outline" className="border-neutral-700 text-neutral-300 font-mono text-[11px]">
                                                        {h.slug}
                                                    </Badge>
                                                    <Badge className={h.isCodeSubmissionOpen ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-neutral-800 text-neutral-400'}>
                                                        Phase 2: {h.isCodeSubmissionOpen ? 'Unlocked' : 'Locked'}
                                                    </Badge>
                                                    {h.blindJudgingEnabled && (
                                                        <Badge className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20">
                                                            Blind Mode ON
                                                        </Badge>
                                                    )}
                                                </div>

                                                {h.theme && (
                                                    <div className="flex items-center gap-2 text-sm text-indigo-300 font-medium">
                                                        <Target className="w-4 h-4 shrink-0 text-indigo-400" />
                                                        <span>Theme: {h.theme}</span>
                                                    </div>
                                                )}

                                                {h.description && (
                                                    <p className="text-sm text-neutral-400 line-clamp-2">{h.description}</p>
                                                )}

                                                {h.customAiPrompt && (
                                                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs text-neutral-300 flex items-start gap-2">
                                                        <Bot className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                                        <div>
                                                            <span className="font-semibold text-primary">Custom AI Prompt: </span>
                                                            <span className="italic">{h.customAiPrompt}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex flex-wrap gap-2 pt-1 text-xs text-neutral-400">
                                                    <span className="font-semibold text-neutral-300">Tracks ({h.tracks?.length || 0}):</span>
                                                    {h.tracks?.map((t, idx) => (
                                                        <Badge key={idx} variant="secondary" className="bg-neutral-800/80 text-neutral-300 text-[11px]">
                                                            {t.name} ({t.rubrics?.length || 0} rubrics)
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                                <Button variant="outline" size="sm" onClick={() => handleEdit(h)} className="border-neutral-800 text-neutral-300 hover:bg-neutral-800">
                                                    <Edit3 className="w-4 h-4 mr-1.5" /> Edit
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(h._id, h.name)}
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                                    disabled={hackathons.length <= 1}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

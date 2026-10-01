'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { UploadCloud, FileText, CheckCircle2, ArrowRight, Brain, AlertCircle, RefreshCw } from 'lucide-react';
import { useState, useEffect, DragEvent } from 'react';
import Link from 'next/link';

interface IEvaluationResult {
    submissionId: string;
    totalScore: number;
    summary: string;
    strengths?: string[];
    weaknesses?: string[];
}

export default function DocumentUpload() {
    const [file, setFile] = useState<File | null>(null);
    const [teamName, setTeamName] = useState('');
    const [track, setTrack] = useState('');
    const [availableTracks, setAvailableTracks] = useState<{ name: string }[]>([]);
    const [problemStatement, setProblemStatement] = useState('');
    const [memberCount, setMemberCount] = useState<number | ''>(1);
    const [members, setMembers] = useState<{ name: string; department: string; rollNo: string }[]>([
        { name: '', department: '', rollNo: '' }
    ]);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [result, setResult] = useState<IEvaluationResult | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setErrorMessage(null);
        }
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.type === 'application/pdf' || droppedFile.name.endsWith('.pdf')) {
                setFile(droppedFile);
                setErrorMessage(null);
            } else {
                setErrorMessage('Please drop a valid PDF file.');
            }
        }
    };

    useEffect(() => {
        fetch('/api/settings')
            .then((res) => res.json())
            .then((data) => {
                if (data.success && data.tracks) {
                    setAvailableTracks(data.tracks);
                }
            })
            .catch(console.error);
    }, []);

    const handleMemberCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === '') {
            setMemberCount('');
            return;
        }
        const count = parseInt(val);
        const validCount = Math.min(Math.max(count, 1), 10);
        setMemberCount(validCount);

        setMembers((prev) => {
            const newMembers = [...prev];
            while (newMembers.length < validCount) newMembers.push({ name: '', department: '', rollNo: '' });
            if (newMembers.length > validCount) newMembers.length = validCount;
            return newMembers;
        });
    };

    const handleMemberChange = (index: number, field: 'name' | 'department' | 'rollNo', value: string) => {
        setMembers((prev) => {
            const newMembers = [...prev];
            newMembers[index] = { ...newMembers[index], [field]: value };
            return newMembers;
        });
    };

    const handleUpload = async () => {
        if (!file || !teamName) return;

        setIsUploading(true);
        setErrorMessage(null);
        setProgress(20);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('teamName', teamName);
        formData.append('track', track || 'General');
        formData.append('problemStatement', problemStatement);

        const membersList = members.filter((m) => m.name.trim() || m.department.trim() || m.rollNo.trim());
        formData.append('members', JSON.stringify(membersList));

        try {
            const interval = setInterval(() => {
                setProgress((prev) => (prev >= 90 ? 90 : prev + 10));
            }, 400);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            clearInterval(interval);
            setProgress(100);

            const data = await res.json();

            if (res.ok && data.success) {
                setResult({
                    submissionId: data.submissionId,
                    totalScore: data.evaluation?.totalScore || 0,
                    summary: data.evaluation?.summaryForJudges || 'Evaluation complete.',
                    strengths: data.evaluation?.strengths || [],
                    weaknesses: data.evaluation?.weaknesses || []
                });
            } else {
                setErrorMessage(data.error || 'Failed to analyze presentation.');
            }
        } catch (error) {
            console.error('Upload failed', error);
            setErrorMessage('Network connection error. Please try again.');
        } finally {
            setIsUploading(false);
            setTimeout(() => setProgress(0), 1000);
        }
    };

    const resetForm = () => {
        setResult(null);
        setFile(null);
        setTeamName('');
        setTrack('');
        setProblemStatement('');
        setMemberCount(1);
        setMembers([{ name: '', department: '', rollNo: '' }]);
        setErrorMessage(null);
    };

    if (result) {
        return (
            <div className="flex justify-center items-center py-6">
                <Card className="w-full max-w-xl shadow-2xl border-primary/30 bg-background/80 backdrop-blur-xl animate-in zoom-in-95 duration-500">
                    <CardHeader className="text-center pb-4">
                        <div className="mx-auto bg-emerald-500/10 w-16 h-16 rounded-full flex items-center justify-center mb-3 border border-emerald-500/20 text-emerald-400">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight text-white">AI Evaluation Completed!</CardTitle>
                        <CardDescription className="text-neutral-400">
                            Your pitch deck has been analyzed and indexed in the leaderboard.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-primary/10 border border-primary/20 rounded-xl p-5 flex items-center justify-between">
                            <div>
                                <span className="text-xs uppercase tracking-wider text-primary font-semibold">Standardized ATS Score</span>
                                <h3 className="text-3xl font-extrabold text-white mt-1">
                                    {result.totalScore} <span className="text-base font-normal text-neutral-400">/ 100</span>
                                </h3>
                            </div>
                            <Badge className="bg-primary/20 text-primary border-primary/30 px-3 py-1 text-sm">
                                Track: {track || 'General'}
                            </Badge>
                        </div>

                        <div className="space-y-2 bg-neutral-900/50 p-4 rounded-lg border border-neutral-800">
                            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
                                <Brain className="w-4 h-4 text-primary" /> AI Summary Snippet
                            </div>
                            <p className="text-sm text-neutral-300 leading-relaxed">{result.summary}</p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <Button asChild className="flex-1 bg-primary hover:bg-primary/90">
                                <Link href={`/admin/submission/${result.submissionId}`}>
                                    View Detailed Scorecard <ArrowRight className="w-4 h-4 ml-2" />
                                </Link>
                            </Button>
                            <Button onClick={resetForm} variant="outline" className="text-neutral-300 border-neutral-800 hover:bg-neutral-800">
                                <RefreshCw className="w-4 h-4 mr-2" /> Submit Another
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex justify-center items-center py-4">
            <Card className="w-full max-w-2xl shadow-xl border-primary/20 bg-background/60 backdrop-blur-md">
                <CardHeader className="text-center pb-4">
                    <CardTitle className="text-2xl font-bold tracking-tight text-white">Submit Project Pitch Deck</CardTitle>
                    <CardDescription className="text-neutral-400">
                        Upload your PDF presentation to receive instant algorithmic feedback & scoring
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="teamName" className="font-semibold text-white">Team or Project Name *</Label>
                            <Input
                                id="teamName"
                                placeholder="e.g. Acme Innovations"
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                                disabled={isUploading}
                                className="bg-neutral-900/50 border-neutral-800 text-white"
                                required
                            />
                        </div>

                        {availableTracks.length > 0 && (
                            <div className="space-y-2">
                                <Label htmlFor="track" className="font-semibold text-white">Hackathon Track</Label>
                                <select
                                    id="track"
                                    value={track}
                                    onChange={(e) => setTrack(e.target.value)}
                                    className="w-full flex h-10 px-3 py-2 border border-neutral-800 bg-neutral-900/50 rounded-md text-sm text-white"
                                    disabled={isUploading}
                                >
                                    <option value="">General Track (Default)</option>
                                    {availableTracks.map((t, idx) => (
                                        <option key={idx} value={t.name}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="problemStatement" className="font-semibold text-white">Problem Statement & Solution *</Label>
                        <Input
                            id="problemStatement"
                            placeholder="Briefly describe the core problem and your proposed technical solution"
                            value={problemStatement}
                            onChange={(e) => setProblemStatement(e.target.value)}
                            disabled={isUploading}
                            className="bg-neutral-900/50 border-neutral-800 text-white"
                            required
                        />
                    </div>

                    <div className="space-y-4 pt-2 pb-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="memberCount" className="font-semibold text-white">Team Members ({typeof memberCount === 'number' ? memberCount : 1})</Label>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-neutral-400">Total:</span>
                                <Input
                                    id="memberCount"
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={memberCount}
                                    onChange={handleMemberCountChange}
                                    disabled={isUploading}
                                    className="w-16 h-8 text-center bg-neutral-900/50 border-neutral-800 text-white"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            {Array.from({ length: typeof memberCount === 'number' ? memberCount : 1 }).map((_, index) => (
                                <div key={index} className="p-3 bg-neutral-900/30 border border-neutral-800/80 rounded-lg space-y-2">
                                    <div className="flex items-center justify-between text-xs text-neutral-400 font-medium">
                                        <span>Member {index + 1}</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                        <Input
                                            placeholder="Full Name"
                                            value={members[index]?.name || ''}
                                            onChange={(e) => handleMemberChange(index, 'name', e.target.value)}
                                            disabled={isUploading}
                                            className="h-8 text-xs bg-neutral-900/70 border-neutral-800 text-white"
                                        />
                                        <Input
                                            placeholder="Department (e.g. CS)"
                                            value={members[index]?.department || ''}
                                            onChange={(e) => handleMemberChange(index, 'department', e.target.value)}
                                            disabled={isUploading}
                                            className="h-8 text-xs bg-neutral-900/70 border-neutral-800 text-white"
                                        />
                                        <Input
                                            placeholder="Roll / Student ID"
                                            value={members[index]?.rollNo || ''}
                                            onChange={(e) => handleMemberChange(index, 'rollNo', e.target.value)}
                                            disabled={isUploading}
                                            className="h-8 text-xs bg-neutral-900/70 border-neutral-800 text-white"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="font-semibold text-white">Presentation File (PDF) *</Label>
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer
                ${isDragging ? 'border-primary bg-primary/10 scale-[1.01]' : file ? 'border-primary/50 bg-primary/5' : 'border-neutral-800 hover:border-primary/40 hover:bg-neutral-900/40'}`}
                        >
                            <Input
                                id="file-upload"
                                type="file"
                                accept=".pdf"
                                className="hidden"
                                onChange={handleFileChange}
                                disabled={isUploading}
                            />
                            <Label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2 text-center w-full">
                                {file ? (
                                    <>
                                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                            <FileText className="h-6 w-6" />
                                        </div>
                                        <span className="font-semibold text-sm text-white">{file.name}</span>
                                        <span className="text-xs text-neutral-400">{(file.size / 1024 / 1024).toFixed(2)} MB • Ready to analyze</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400">
                                            <UploadCloud className="h-6 w-6" />
                                        </div>
                                        <span className="font-medium text-sm text-neutral-200">Click to upload or drag & drop</span>
                                        <span className="text-xs text-neutral-500">PDF presentations up to 10MB</span>
                                    </>
                                )}
                            </Label>
                        </div>
                    </div>

                    {errorMessage && (
                        <div className="p-3 bg-red-900/30 border border-red-900/50 rounded-lg text-red-300 text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {isUploading && (
                        <div className="space-y-2 bg-neutral-900/50 p-4 rounded-lg border border-neutral-800 animate-in fade-in">
                            <div className="flex justify-between text-xs font-medium text-neutral-300">
                                <span className="flex items-center gap-1.5">
                                    <Brain className="w-3.5 h-3.5 text-primary animate-pulse" />
                                    Parsing presentation & evaluating with Gemini...
                                </span>
                                <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2 bg-neutral-800" />
                        </div>
                    )}

                    <Button
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25"
                        size="lg"
                        disabled={!file || !teamName || isUploading}
                        onClick={handleUpload}
                    >
                        {isUploading ? 'Evaluating Project with AI...' : 'Submit to AI Judge'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

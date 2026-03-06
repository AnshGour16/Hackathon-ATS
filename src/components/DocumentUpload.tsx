'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { UploadCloud, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function DocumentUpload() {
    const [file, setFile] = useState<File | null>(null);
    const [teamName, setTeamName] = useState('');
    const [track, setTrack] = useState('');
    const [availableTracks, setAvailableTracks] = useState<{ name: string }[]>([]);
    const [problemStatement, setProblemStatement] = useState('');
    const [memberCount, setMemberCount] = useState<number | ''>(1);
    const [members, setMembers] = useState<{ name: string, department: string, rollNo: string }[]>([{ name: '', department: '', rollNo: '' }]);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    useEffect(() => {
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
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

        setMembers(prev => {
            const newMembers = [...prev];
            while (newMembers.length < validCount) newMembers.push({ name: '', department: '', rollNo: '' });
            if (newMembers.length > validCount) newMembers.length = validCount;
            return newMembers;
        });
    };

    const handleMemberChange = (index: number, field: 'name' | 'department' | 'rollNo', value: string) => {
        setMembers(prev => {
            const newMembers = [...prev];
            newMembers[index] = { ...newMembers[index], [field]: value };
            return newMembers;
        });
    };

    const handleUpload = async () => {
        if (!file || !teamName) return;

        setIsUploading(true);
        setProgress(20);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('teamName', teamName);
        formData.append('track', track || 'General');
        formData.append('problemStatement', problemStatement);

        // Filter out completely empty rows
        const membersList = members.filter(m => m.name.trim() || m.department.trim() || m.rollNo.trim());
        formData.append('members', JSON.stringify(membersList));

        try {
            // Fake progress while waiting for real API
            const interval = setInterval(() => {
                setProgress((prev) => (prev >= 90 ? 90 : prev + 10));
            }, 500);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            clearInterval(interval);
            setProgress(100);

            const data = await res.json();

            if (res.ok) {
                alert('Upload & AI Evaluation successful! Score: ' + data.evaluation.totalScore);
                setFile(null);
                setTeamName('');
                setTrack('');
                setProblemStatement('');
                setMemberCount(1);
                setMembers([{ name: '', department: '', rollNo: '' }]);
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Upload failed', error);
            alert('Upload failed. Check console.');
        } finally {
            setIsUploading(false);
            setTimeout(() => setProgress(0), 1000);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-[80vh]">
            <Card className="w-full max-w-md shadow-lg border-primary/20 bg-background/60 backdrop-blur-md">
                <CardHeader className="text-center pb-4">
                    <CardTitle className="text-2xl font-bold tracking-tight">Submit Project</CardTitle>
                    <CardDescription className="text-muted-foreground">Upload your pitch deck for AI evaluation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="teamName" className="font-semibold">Team or Project Name</Label>
                        <Input
                            id="teamName"
                            placeholder="e.g. Acme Corp"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            disabled={isUploading}
                        />
                    </div>

                    {availableTracks.length > 0 && (
                        <div className="space-y-2">
                            <Label htmlFor="track" className="font-semibold">Hackathon Track</Label>
                            <select
                                id="track"
                                value={track}
                                onChange={(e) => setTrack(e.target.value)}
                                className="w-full flex h-10 px-3 py-2 border border-neutral-800 bg-neutral-900/50 rounded-md text-sm text-white"
                                disabled={isUploading}
                            >
                                <option value="" disabled>Select a track</option>
                                {availableTracks.map((t, idx) => (
                                    <option key={idx} value={t.name}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="problemStatement" className="font-semibold">Problem Statement</Label>
                        <Input
                            id="problemStatement"
                            placeholder="Briefly describe the problem you're solving"
                            value={problemStatement}
                            onChange={(e) => setProblemStatement(e.target.value)}
                            disabled={isUploading}
                        />
                    </div>

                    <div className="space-y-4 pt-2 pb-2">
                        <div className="space-y-2">
                            <Label htmlFor="memberCount" className="font-semibold">Number of Team Members</Label>
                            <Input
                                id="memberCount"
                                type="number"
                                min={1}
                                max={10}
                                value={memberCount}
                                onChange={handleMemberCountChange}
                                disabled={isUploading}
                            />
                        </div>

                        {Array.from({ length: typeof memberCount === 'number' ? memberCount : 1 }).map((_, index) => (
                            <div key={index} className="space-y-3 ml-4 border-l-2 border-primary/20 pl-4 py-3">
                                <h4 className="text-sm font-bold text-white">Member {index + 1}</h4>
                                <div className="space-y-2">
                                    <Label htmlFor={`member-${index}-name`} className="font-semibold text-xs text-neutral-300">Name</Label>
                                    <Input
                                        id={`member-${index}-name`}
                                        placeholder="Full Name"
                                        value={members[index]?.name || ''}
                                        onChange={(e) => handleMemberChange(index, 'name', e.target.value)}
                                        disabled={isUploading}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor={`member-${index}-dept`} className="font-semibold text-xs text-neutral-300">Department</Label>
                                        <Input
                                            id={`member-${index}-dept`}
                                            placeholder="e.g. CS"
                                            value={members[index]?.department || ''}
                                            onChange={(e) => handleMemberChange(index, 'department', e.target.value)}
                                            disabled={isUploading}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`member-${index}-roll`} className="font-semibold text-xs text-neutral-300">Roll No</Label>
                                        <Input
                                            id={`member-${index}-roll`}
                                            placeholder="e.g. 1042"
                                            value={members[index]?.rollNo || ''}
                                            onChange={(e) => handleMemberChange(index, 'rollNo', e.target.value)}
                                            disabled={isUploading}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2">
                        <Label className="font-semibold">Presentation File (PDF)</Label>
                        <div
                            className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors
                ${file ? 'border-primary/50 bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'}`}
                        >
                            <Input
                                id="file-upload"
                                type="file"
                                accept=".pdf"
                                className="hidden"
                                onChange={handleFileChange}
                                disabled={isUploading}
                            />
                            <Label
                                htmlFor="file-upload"
                                className="cursor-pointer flex flex-col items-center gap-2 text-center w-full"
                            >
                                {file ? (
                                    <>
                                        <FileText className="h-10 w-10 text-primary" />
                                        <span className="font-medium text-sm">{file.name}</span>
                                        <span className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud className="h-10 w-10 text-muted-foreground" />
                                        <span className="font-medium">Click to upload</span>
                                        <span className="text-xs text-muted-foreground">PDFs only (Max 10MB)</span>
                                    </>
                                )}
                            </Label>
                        </div>
                    </div>

                    {isUploading && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-medium text-muted-foreground">
                                <span>Uploading & Analyzing...</span>
                                <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                        </div>
                    )}

                    <Button
                        className="w-full"
                        size="lg"
                        disabled={!file || !teamName || isUploading}
                        onClick={handleUpload}
                    >
                        {isUploading ? 'Processing...' : 'Submit to AI Judge'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

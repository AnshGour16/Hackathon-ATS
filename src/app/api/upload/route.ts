import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Team from '@/models/Team';
import Submission from '@/models/Submission';
import { extractTextFromPDF } from '@/lib/pdf-parser';
import { evaluatePresentationWithGemini } from '@/lib/gemini';
import Settings, { ITrack } from '@/models/Settings';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Note: In a real app we'd save to S3. Here we process in memory or save locally.
export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        const session = await getServerSession(authOptions);
        let user = null;

        if (session?.user?.email) {
            user = await User.findOne({ email: session.user.email });
        }

        // If no authenticated user, find or create a default guest participant user
        if (!user) {
            user = await User.findOneAndUpdate(
                { email: 'guest@hackathon.com' },
                {
                    $setOnInsert: {
                        name: 'Guest Submitter',
                        email: 'guest@hackathon.com',
                        role: 'PARTICIPANT'
                    }
                },
                { upsert: true, new: true }
            );
        }

        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const teamName = formData.get('teamName') as string | null;
        const problemStatement = formData.get('problemStatement') as string | null;
        const trackName = formData.get('track') as string | null;
        const membersStr = formData.get('members') as string | null;

        if (!file || !teamName) {
            return NextResponse.json({ error: 'File and Team Name are required' }, { status: 400 });
        }

        let members: { name: string; department: string; rollNo: string }[] = [];
        try {
            if (membersStr) members = JSON.parse(membersStr);
        } catch {
            console.log('Failed to parse members array');
        }

        // Convert File to Buffer for parsing
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Save the file to public/uploads
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadDir, { recursive: true });

        const timestamp = Date.now();
        const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${timestamp}-${safeFilename}`;
        const filePath = path.join(uploadDir, filename);

        await writeFile(filePath, buffer);
        const fileUrl = `/uploads/${filename}`;

        // 1. Fetch Track Settings
        let trackSettings = null;
        if (trackName) {
            const globalSettings = await Settings.findById('global');
            if (globalSettings && globalSettings.tracks) {
                trackSettings = globalSettings.tracks.find((t: ITrack) => t.name === trackName);
            }
        }

        // 2. Create Team (dummy leader/password for MVP)
        const team = new Team({
            name: teamName,
            track: trackName || 'General',
            problemStatement: problemStatement || 'Not Provided',
            leader: user._id,
            members: members
        });
        await team.save();

        // 2. Create Submission (Status: Processing)
        const submission = new Submission({
            team: team._id,
            fileName: file.name,
            fileUrl: fileUrl,
            status: 'AI_PROCESSING'
        });
        await submission.save();

        // 3. Extract Text & Evaluate with Gemini
        try {
            const text = await extractTextFromPDF(buffer);

            if (!text || !text.trim()) {
                submission.status = 'FAILED';
                await submission.save();
                return NextResponse.json(
                    { error: 'Could not extract readable text from this PDF. Please upload a text-based PDF presentation.' },
                    { status: 400 }
                );
            }

            // 4. Send to Gemini for purely Pitch Deck Analysis
            const evaluation = await evaluatePresentationWithGemini(text, trackSettings);

            // 5. Update Submission
            submission.aiEvaluation = evaluation;
            submission.status = 'EVALUATED';
            await submission.save();

            return NextResponse.json({
                success: true,
                submissionId: submission._id,
                evaluation
            });
        } catch (evalError) {
            submission.status = 'FAILED';
            await submission.save();
            throw evalError;
        }

    } catch (error: unknown) {
        console.error('API Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Server error'
        }, { status: 500 });
    }
}

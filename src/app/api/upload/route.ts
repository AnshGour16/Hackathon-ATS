import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Team from '@/models/Team';
import Submission from '@/models/Submission';
import { extractTextFromPDF } from '@/lib/pdf-parser';
import { evaluatePresentationWithGemini } from '@/lib/gemini';
import { ITrack } from '@/models/Hackathon';
import Hackathon from '@/models/Hackathon';
import { getOrCreateDefaultHackathon } from '@/lib/hackathon-service';
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

        if (!user) {
            return NextResponse.json({
                error: 'Authentication required. Please sign in or register your team before submitting a presentation.'
            }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const teamName = formData.get('teamName') as string | null;
        const problemStatement = formData.get('problemStatement') as string | null;
        const trackName = formData.get('track') as string | null;
        const hackathonId = formData.get('hackathonId') as string | null;
        const membersStr = formData.get('members') as string | null;

        if (!file) {
            return NextResponse.json({ error: 'Presentation file is required' }, { status: 400 });
        }

        let members: { name: string; department?: string; rollNo?: string; email?: string; college?: string }[] = [];
        try {
            if (membersStr) members = JSON.parse(membersStr);
        } catch {
            console.log('Failed to parse members array');
        }

        // Convert File to Buffer for parsing
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Save the file to public/uploads when writable (local dev); fall back to in-memory on read-only serverless (e.g., Vercel)
        let fileUrl = 'local-memory';
        try {
            const uploadDir = path.join(process.cwd(), 'public', 'uploads');
            await mkdir(uploadDir, { recursive: true });

            const timestamp = Date.now();
            const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const filename = `${timestamp}-${safeFilename}`;
            const filePath = path.join(uploadDir, filename);

            await writeFile(filePath, buffer);
            fileUrl = `/uploads/${filename}`;
        } catch (fsError) {
            console.warn('Skipping local file write (read-only filesystem):', fsError instanceof Error ? fsError.message : fsError);
        }

        // 1. Resolve Hackathon Context & Track Settings
        let hackathon = null;
        if (hackathonId) {
            hackathon = await Hackathon.findById(hackathonId);
        }
        if (!hackathon) {
            hackathon = await getOrCreateDefaultHackathon();
        }

        let trackSettings = null;
        if (trackName && hackathon?.tracks) {
            trackSettings = hackathon.tracks.find((t: ITrack) => t.name === trackName);
        }

        // 2. Resolve or find Team for this authenticated leader
        let team = await Team.findOne({ leader: user._id });

        if (!team) {
            if (!teamName) {
                return NextResponse.json({ error: 'Team name is required for new registration.' }, { status: 400 });
            }
            team = new Team({
                name: teamName,
                hackathon: hackathon._id,
                track: trackName || 'General',
                problemStatement: problemStatement || 'Not Provided',
                leader: user._id,
                members: members
            });
            await team.save();
        } else {
            // Update team's info if provided
            if (teamName) team.name = teamName;
            if (trackName) team.track = trackName;
            if (problemStatement) team.problemStatement = problemStatement;
            if (hackathon) team.hackathon = hackathon._id;
            if (members.length > 0) team.members = members;
            await team.save();
        }

        // 3. Find or Create Submission for this team (prevents duplicate submission pollution!)
        let submission = await Submission.findOne({ team: team._id });
        if (!submission) {
            submission = new Submission({
                team: team._id,
                hackathon: hackathon._id,
                fileName: file.name,
                fileUrl: fileUrl,
                status: 'AI_PROCESSING'
            });
        } else {
            submission.fileName = file.name;
            submission.fileUrl = fileUrl;
            submission.hackathon = hackathon._id;
            submission.status = 'AI_PROCESSING';
        }
        await submission.save();

        // 3. Extract Text & Evaluate with Gemini using specific Hackathon prompts & Theme
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

            // 4. Send to Gemini with full Hackathon Theme, Description, & Custom AI Prompt
            const evaluation = await evaluatePresentationWithGemini(text, {
                trackSettings,
                hackathonName: hackathon.name,
                hackathonTheme: hackathon.theme,
                hackathonDescription: hackathon.description,
                customAiPrompt: hackathon.customAiPrompt
            });

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

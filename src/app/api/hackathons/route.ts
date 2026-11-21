import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Hackathon from '@/models/Hackathon';
import { getOrCreateDefaultHackathon } from '@/lib/hackathon-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await connectToDatabase();
        await getOrCreateDefaultHackathon();

        const hackathons = await Hackathon.find({}).sort({ createdAt: -1 }).lean();
        return NextResponse.json({ success: true, count: hackathons.length, data: hackathons });
    } catch (error: unknown) {
        console.error('API Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Server error'
        }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const userRole = (session?.user as { role?: string } | undefined)?.role;
        if (!session || (userRole !== 'ADMIN' && session.user?.email !== 'admin@hackathon.com')) {
            return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
        }

        await connectToDatabase();
        const body = await req.json();

        const {
            name,
            slug,
            description,
            theme,
            customAiPrompt,
            tracks,
            isCodeSubmissionOpen,
            blindJudgingEnabled
        } = body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return NextResponse.json({ error: 'Hackathon name is required.' }, { status: 400 });
        }

        // Generate slug from name if not provided
        let safeSlug = (slug || name)
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        if (!safeSlug) safeSlug = `hackathon-${Date.now()}`;

        // Check for duplicate slug
        const existing = await Hackathon.findOne({ slug: safeSlug });
        if (existing) {
            safeSlug = `${safeSlug}-${Date.now().toString().slice(-4)}`;
        }

        const newHackathon = await Hackathon.create({
            name: name.trim(),
            slug: safeSlug,
            description: description?.trim() || '',
            theme: theme?.trim() || '',
            customAiPrompt: customAiPrompt?.trim() || '',
            isCodeSubmissionOpen: Boolean(isCodeSubmissionOpen),
            blindJudgingEnabled: Boolean(blindJudgingEnabled),
            tracks: Array.isArray(tracks) && tracks.length > 0
                ? tracks
                : [
                    {
                        name: 'General',
                        requiredSlides: ['Problem Statement', 'Solution Architecture', 'Tech Stack'],
                        rubrics: [
                            { criterion: 'Innovation', weightage: 10, description: 'Originality and uniqueness' },
                            { criterion: 'Technical Feasibility', weightage: 10, description: 'Architecture & practical execution' },
                            { criterion: 'Completeness', weightage: 10, description: 'MVP implementation depth' }
                        ]
                    }
                ],
            isActive: true
        });

        return NextResponse.json({
            success: true,
            message: 'Hackathon created successfully.',
            data: newHackathon
        }, { status: 201 });

    } catch (error: unknown) {
        console.error('API Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Server error'
        }, { status: 500 });
    }
}

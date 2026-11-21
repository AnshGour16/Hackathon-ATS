import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Settings from '@/models/Settings';
import Hackathon from '@/models/Hackathon';
import { getOrCreateDefaultHackathon } from '@/lib/hackathon-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Helper function to safely get or create the global settings document
async function getGlobalSettings() {
    let settings = await Settings.findById('global');
    if (!settings) {
        settings = new Settings({ _id: 'global', isCodeSubmissionOpen: false });
        await settings.save();
    }
    return settings;
}

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        await getOrCreateDefaultHackathon();

        const { searchParams } = new URL(req.url);
        const hackathonId = searchParams.get('hackathonId');

        if (hackathonId && hackathonId !== 'ALL') {
            const hackathon = await Hackathon.findById(hackathonId).lean();
            if (hackathon) {
                return NextResponse.json({
                    success: true,
                    hackathonId: hackathon._id,
                    name: hackathon.name,
                    theme: hackathon.theme,
                    description: hackathon.description,
                    customAiPrompt: hackathon.customAiPrompt,
                    isCodeSubmissionOpen: hackathon.isCodeSubmissionOpen,
                    blindJudgingEnabled: hackathon.blindJudgingEnabled,
                    tracks: hackathon.tracks || []
                });
            }
        }

        const settings = await getGlobalSettings();
        return NextResponse.json({
            success: true,
            isCodeSubmissionOpen: settings.isCodeSubmissionOpen,
            blindJudgingEnabled: settings.blindJudgingEnabled,
            tracks: settings.tracks || []
        });
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
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        const body = await req.json();

        // If specific hackathonId provided, update that hackathon
        if (body.hackathonId && body.hackathonId !== 'ALL') {
            const hackathon = await Hackathon.findById(body.hackathonId);
            if (hackathon) {
                if (typeof body.isCodeSubmissionOpen === 'boolean') {
                    hackathon.isCodeSubmissionOpen = body.isCodeSubmissionOpen;
                }
                if (typeof body.blindJudgingEnabled === 'boolean') {
                    hackathon.blindJudgingEnabled = body.blindJudgingEnabled;
                }
                if (Array.isArray(body.tracks)) {
                    hackathon.tracks = body.tracks;
                }
                if (typeof body.theme === 'string') hackathon.theme = body.theme;
                if (typeof body.description === 'string') hackathon.description = body.description;
                if (typeof body.customAiPrompt === 'string') hackathon.customAiPrompt = body.customAiPrompt;

                await hackathon.save();

                return NextResponse.json({
                    success: true,
                    hackathonId: hackathon._id,
                    isCodeSubmissionOpen: hackathon.isCodeSubmissionOpen,
                    blindJudgingEnabled: hackathon.blindJudgingEnabled,
                    tracks: hackathon.tracks
                });
            }
        }

        const settings = await getGlobalSettings();

        if (typeof body.isCodeSubmissionOpen === 'boolean') {
            settings.isCodeSubmissionOpen = body.isCodeSubmissionOpen;
        }
        if (typeof body.blindJudgingEnabled === 'boolean') {
            settings.blindJudgingEnabled = body.blindJudgingEnabled;
        }
        if (Array.isArray(body.tracks)) {
            settings.tracks = body.tracks;
        }

        await settings.save();

        return NextResponse.json({
            success: true,
            isCodeSubmissionOpen: settings.isCodeSubmissionOpen,
            blindJudgingEnabled: settings.blindJudgingEnabled,
            tracks: settings.tracks
        });
    } catch (error: unknown) {
        console.error('API Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Server error'
        }, { status: 500 });
    }
}

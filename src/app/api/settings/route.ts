import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Settings from '@/models/Settings';
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

export async function GET() {
    try {
        await connectToDatabase();
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

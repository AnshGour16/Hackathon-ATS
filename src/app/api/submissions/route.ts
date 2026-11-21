import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Submission from '@/models/Submission';
import '@/models/Team'; // To populate references
import '@/models/Hackathon';
import { getOrCreateDefaultHackathon } from '@/lib/hackathon-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        await getOrCreateDefaultHackathon();

        const { searchParams } = new URL(req.url);
        const hackathonId = searchParams.get('hackathonId');

        const filter: Record<string, unknown> = {};
        if (hackathonId && hackathonId !== 'ALL') {
            filter.hackathon = hackathonId;
        }

        // Fetch submissions and populate the team and hackathon info
        const submissions = await Submission.find(filter)
            .populate('team', 'name projectTitle problemStatement track githubUrl hackathon isShortlisted shortlistRank shortlistedAt')
            .populate('hackathon', 'name slug theme shortlistingStatus shortlistLimit shortlistingMode shortlistedAt shortlistCount')
            .sort({ createdAt: -1 })
            .lean(); // Faster to use lean for read-only

        return NextResponse.json({ success: true, count: submissions.length, data: submissions });
    } catch (error: unknown) {
        console.error('API Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Server error'
        }, { status: 500 });
    }
}

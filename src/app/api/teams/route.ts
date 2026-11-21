import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Team from '@/models/Team';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(req.url);
        const hackathonId = searchParams.get('hackathonId');

        const query: Record<string, unknown> = {
            $or: [
                { githubUrl: { $exists: false } },
                { githubUrl: null },
                { githubUrl: '' }
            ]
        };

        if (hackathonId && hackathonId !== 'ALL') {
            query.hackathon = hackathonId;
        }

        // Find all teams that don't have a githubUrl populated yet
        const teams = await Team.find(query).select('_id name track hackathon');

        return NextResponse.json({ success: true, teams });
    } catch (error: unknown) {
        console.error('API Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Server error'
        }, { status: 500 });
    }
}

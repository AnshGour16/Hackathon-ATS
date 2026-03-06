import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Team from '@/models/Team';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await connectToDatabase();

        // Find all teams that don't have a githubUrl populated yet
        const teams = await Team.find({ githubUrl: { $exists: false } }).select('_id name');

        return NextResponse.json({ success: true, teams });
    } catch (error: unknown) {
        console.error('API Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Server error'
        }, { status: 500 });
    }
}

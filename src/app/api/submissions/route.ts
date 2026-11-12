import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Submission from '@/models/Submission';
import '@/models/Team'; // To populate references

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await connectToDatabase();

        // Fetch submissions and populate the team info
        const submissions = await Submission.find({})
            .populate('team', 'name problemStatement track githubUrl')
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

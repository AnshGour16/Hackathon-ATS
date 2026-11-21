import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Submission from '@/models/Submission';
import Team from '@/models/Team';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

import '@/models/Hackathon';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await connectToDatabase();

        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.email) {
            return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
        }

        const user = await User.findOne({ email: session.user.email });
        if (!user) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        // Find the team where this user is the verified leader
        const team = await Team.findOne({ leader: user._id })
            .populate('hackathon', 'name slug theme description isCodeSubmissionOpen blindJudgingEnabled')
            .lean();

        if (!team) {
            return NextResponse.json({
                success: true,
                team: null,
                submission: null,
                message: "No team registered for this account."
            });
        }

        // Find the submission for this team
        const submission = await Submission.findOne({ team: team._id })
            .populate('hackathon', 'name slug theme')
            .lean();

        return NextResponse.json({
            success: true,
            team,
            submission
        });

    } catch (error: unknown) {
        console.error('API Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Server error'
        }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Submission from '@/models/Submission';
import '@/models/Team';
import '@/models/Hackathon';

export const dynamic = 'force-dynamic';

interface IExportSubmission {
    team?: {
        name?: string;
        track?: string;
        problemStatement?: string;
        members?: { name: string }[];
    };
    hackathon?: {
        name?: string;
    };
    status?: string;
    aiEvaluation?: {
        totalScore?: number;
        strengths?: string[];
        weaknesses?: string[];
        missingSections?: string[];
        plagiarismFlag?: boolean;
    };
}

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(req.url);
        const hackathonId = searchParams.get('hackathonId');

        const filter: Record<string, unknown> = {};
        if (hackathonId && hackathonId !== 'ALL') {
            filter.hackathon = hackathonId;
        }

        const submissions = await Submission.find(filter)
            .populate('team', 'name problemStatement track members')
            .populate('hackathon', 'name')
            .sort({ 'aiEvaluation.totalScore': -1, createdAt: -1 })
            .lean() as unknown as IExportSubmission[];

        // CSV Header
        const headers = [
            'Hackathon',
            'Team Name',
            'Track',
            'Problem Statement',
            'Member Count',
            'Status',
            'Total Score',
            'Strengths',
            'Weaknesses',
            'Missing Sections',
            'Plagiarism Flag'
        ];

        // Format rows
        const rows = (submissions || []).map(sub => {
            const team = sub.team || {};
            const hackathon = sub.hackathon || {};
            const evalData = sub.aiEvaluation || {};
            return [
                hackathon.name || 'Global',
                team.name || 'Unknown',
                team.track || 'General',
                (team.problemStatement || '').replace(/"/g, '""'), // Escape quotes for CSV
                team.members?.length || 0,
                sub.status || 'PENDING',
                evalData.totalScore || 0,
                (evalData.strengths?.join('; ') || '').replace(/"/g, '""'),
                (evalData.weaknesses?.join('; ') || '').replace(/"/g, '""'),
                (evalData.missingSections?.join('; ') || '').replace(/"/g, '""'),
                evalData.plagiarismFlag ? 'YES' : 'NO'
            ].map(String).map(item => `"${item}"`).join(','); // Wrap each field in quotes to handle commas within strings
        });

        const csvContent = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');

        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': 'attachment; filename="hackathon_leaderboard.csv"',
            },
        });
    } catch (error: unknown) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

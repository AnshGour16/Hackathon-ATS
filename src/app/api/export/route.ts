import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Submission from '@/models/Submission';
import '@/models/Team';

export const dynamic = 'force-dynamic';

interface IExportSubmission {
    team?: {
        name?: string;
        track?: string;
        problemStatement?: string;
        members?: { name: string }[];
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

export async function GET() {
    try {
        await connectToDatabase();

        const submissions = await Submission.find({})
            .populate('team', 'name problemStatement track members')
            .sort({ createdAt: -1 })
            .lean() as unknown as IExportSubmission[];

        if (!submissions || submissions.length === 0) {
            return new NextResponse('No submissions found', { status: 404 });
        }

        // CSV Header
        const headers = [
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
        const rows = submissions.map(sub => {
            const team = sub.team || {};
            const evalData = sub.aiEvaluation || {};
            return [
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
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

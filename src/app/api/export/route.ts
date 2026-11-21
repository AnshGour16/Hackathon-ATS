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
        projectTitle?: string;
        problemStatement?: string;
        members?: { name: string }[];
        isShortlisted?: boolean;
        shortlistRank?: number;
        shortlistedAt?: string | Date;
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
        const limitParam = searchParams.get('limit');
        const shortlistedOnly = searchParams.get('shortlistedOnly') === 'true';
        const trackParam = searchParams.get('track');

        const filter: Record<string, unknown> = {};
        if (hackathonId && hackathonId !== 'ALL') {
            filter.hackathon = hackathonId;
        }

        let query = Submission.find(filter)
            .populate('team', 'name projectTitle problemStatement track members isShortlisted shortlistRank shortlistedAt')
            .populate('hackathon', 'name')
            .sort({ 'aiEvaluation.totalScore': -1, createdAt: -1 });

        if (limitParam) {
            const limit = parseInt(limitParam, 10);
            if (!isNaN(limit) && limit > 0) {
                query = query.limit(limit);
            }
        }

        let submissions = await query.lean() as unknown as IExportSubmission[];

        // Apply in-memory team filters if needed
        if (shortlistedOnly) {
            submissions = submissions.filter(s => s.team?.isShortlisted);
        }
        if (trackParam && trackParam !== 'ALL') {
            submissions = submissions.filter(s => s.team?.track?.toLowerCase() === trackParam.toLowerCase());
        }

        // CSV Header
        const headers = [
            'Rank',
            'Hackathon',
            'Team Name',
            'Project Title',
            'Track',
            'Total Score',
            'Shortlist Status',
            'Shortlist Rank',
            'Qualified At',
            'Problem Statement',
            'Member Count',
            'Evaluation Status',
            'Plagiarism Flag'
        ];

        // Format rows
        const rows = (submissions || []).map((sub, idx) => {
            const team = sub.team || {};
            const hackathon = sub.hackathon || {};
            const evalData = sub.aiEvaluation || {};
            const isShortlisted = Boolean(team.isShortlisted);
            const shortlistRank = team.shortlistRank ? `#${team.shortlistRank}` : '-';
            const qualifiedAt = team.shortlistedAt ? new Date(team.shortlistedAt).toLocaleDateString() : '-';

            return [
                idx + 1,
                hackathon.name || 'Global',
                team.name || 'Unknown',
                (team.projectTitle || '').replace(/"/g, '""'),
                team.track || 'General',
                evalData.totalScore !== undefined ? evalData.totalScore : 0,
                isShortlisted ? 'SHORTLISTED' : 'NOT SHORTLISTED',
                shortlistRank,
                qualifiedAt,
                (team.problemStatement || '').replace(/"/g, '""'),
                team.members?.length || 0,
                sub.status || 'PENDING',
                evalData.plagiarismFlag ? 'YES' : 'NO'
            ].map(String).map(item => `"${item}"`).join(',');
        });

        const csvContent = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
        const filename = shortlistedOnly ? 'shortlisted_teams.csv' : 'hackathon_leaderboard.csv';

        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error: unknown) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Hackathon from '@/models/Hackathon';
import Submission, { ISubmission } from '@/models/Submission';
import Team from '@/models/Team';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface IPopulatedTeam {
    _id: string;
    name: string;
    track: string;
    projectTitle?: string;
    problemStatement?: string;
    leader?: string;
    isShortlisted: boolean;
    shortlistRank?: number;
    shortlistedAt?: Date;
}

interface ISubmissionWithPopulatedTeam extends Omit<ISubmission, 'team'> {
    team: IPopulatedTeam;
}

/**
 * Deterministic comparator for submissions:
 * 1. Higher totalScore
 * 2. Higher Innovation score
 * 3. Higher Technical Feasibility score
 * 4. Earlier creation timestamp (createdAt)
 * 5. Team ID lexical order (guarantees 100% deterministic order across executions)
 */
function compareSubmissions(a: ISubmissionWithPopulatedTeam, b: ISubmissionWithPopulatedTeam): number {
    const scoreA = Number(a.aiEvaluation?.totalScore) || 0;
    const scoreB = Number(b.aiEvaluation?.totalScore) || 0;
    if (scoreB !== scoreA) {
        return scoreB - scoreA;
    }

    const getCritScore = (sub: ISubmissionWithPopulatedTeam, regex: RegExp): number => {
        const crit = sub.aiEvaluation?.criteriaScores?.find(c => regex.test(c.criterion));
        return Number(crit?.score) || 0;
    };

    // Tie-breaker 1: Innovation
    const innovA = getCritScore(a, /innovation/i);
    const innovB = getCritScore(b, /innovation/i);
    if (innovB !== innovA) {
        return innovB - innovA;
    }

    // Tie-breaker 2: Technical Feasibility
    const techA = getCritScore(a, /feasibility|technical/i);
    const techB = getCritScore(b, /feasibility|technical/i);
    if (techB !== techA) {
        return techB - techA;
    }

    // Tie-breaker 3: Earlier submission timestamp
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    if (timeA !== timeB) {
        return timeA - timeB;
    }

    // Tie-breaker 4: Team ObjectId string comparison
    const idA = a.team?._id ? a.team._id.toString() : '';
    const idB = b.team?._id ? b.team._id.toString() : '';
    return idA.localeCompare(idB);
}

/**
 * GET: Retrieve the current shortlisting status, configuration, and shortlisted teams
 */
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();

        const { id } = await context.params;
        const hackathon = await Hackathon.findById(id).lean();
        if (!hackathon) {
            return NextResponse.json({ error: 'Hackathon not found.' }, { status: 404 });
        }

        const shortlistedTeams = await Team.find({
            hackathon: hackathon._id,
            isShortlisted: true
        })
            .sort({ shortlistRank: 1 })
            .select('name track projectTitle isShortlisted shortlistRank shortlistedAt')
            .lean();

        return NextResponse.json({
            success: true,
            hackathon: {
                _id: hackathon._id,
                name: hackathon.name,
                shortlistingStatus: hackathon.shortlistingStatus || 'NOT_SHORTLISTED',
                shortlistLimit: hackathon.shortlistLimit ?? 25,
                shortlistingMode: hackathon.shortlistingMode || 'OVERALL',
                themeShortlistLimits: hackathon.themeShortlistLimits || [],
                shortlistedAt: hackathon.shortlistedAt || null,
                shortlistCount: hackathon.shortlistCount ?? shortlistedTeams.length
            },
            shortlistedTeams
        });

    } catch (error: unknown) {
        console.error('Error fetching shortlist:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Server error fetching shortlist'
        }, { status: 500 });
    }
}

/**
 * POST: Execute or Preview shortlisting for a hackathon
 */
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();

        // 1. Authenticate Admin
        let session = null;
        try {
            session = await getServerSession(authOptions);
        } catch {
            session = null;
        }

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
        }

        const user = await User.findOne({ email: session.user.email });
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 });
        }

        // 2. Resolve Hackathon
        const { id } = await context.params;
        const hackathon = await Hackathon.findById(id);
        if (!hackathon) {
            return NextResponse.json({ error: 'Hackathon not found.' }, { status: 404 });
        }

        const body = await req.json().catch(() => ({}));
        const mode: 'OVERALL' | 'THEME_WISE' = body.mode === 'THEME_WISE' ? 'THEME_WISE' : 'OVERALL';
        const limit: number = Math.max(1, parseInt(body.limit, 10) || 25);
        const themeLimits: Record<string, number> = body.themeLimits || {};
        const isPreview: boolean = Boolean(body.preview);

        // 3. Fetch submissions strictly belonging ONLY to this hackathon
        // Must be successfully evaluated with a valid numeric score
        const rawSubmissions = await Submission.find({
            hackathon: hackathon._id,
            status: 'EVALUATED',
            'aiEvaluation.totalScore': { $ne: null }
        })
            .populate('team', 'name track projectTitle problemStatement leader isShortlisted shortlistRank shortlistedAt')
            .lean();

        // Filter out any submissions where team reference is missing or orphaned
        const eligibleSubmissions = (rawSubmissions as unknown as ISubmissionWithPopulatedTeam[])
            .filter(s => s && s.team && s.team._id);

        const totalEligible = eligibleSubmissions.length;

        // Sort all eligible submissions deterministically
        eligibleSubmissions.sort(compareSubmissions);

        // 4. Select Qualifying Teams based on chosen mode
        let qualifyingSubmissions: ISubmissionWithPopulatedTeam[] = [];

        if (mode === 'OVERALL') {
            qualifyingSubmissions = eligibleSubmissions.slice(0, limit);
        } else {
            // THEME_WISE Mode
            // Group by track / theme
            const themeMap: Record<string, ISubmissionWithPopulatedTeam[]> = {};
            for (const sub of eligibleSubmissions) {
                const track = sub.team.track || 'General';
                if (!themeMap[track]) themeMap[track] = [];
                themeMap[track].push(sub);
            }

            // For each theme, take up to the configured quota
            for (const [track, subsInTrack] of Object.entries(themeMap)) {
                const trackQuota = themeLimits[track] !== undefined ? Math.max(0, Number(themeLimits[track])) : Math.max(1, Math.floor(limit / Object.keys(themeMap).length));
                const topInTrack = subsInTrack.slice(0, trackQuota);
                qualifyingSubmissions.push(...topInTrack);
            }

            // Re-sort the combined qualified list by overall score to assign ranks
            qualifyingSubmissions.sort(compareSubmissions);
        }

        const qualifyingCount = qualifyingSubmissions.length;
        const cutoffScore = qualifyingCount > 0 ? (qualifyingSubmissions[qualifyingCount - 1].aiEvaluation?.totalScore ?? 0) : 0;

        // Prepare structured response payload
        const qualifyingTeamsList = qualifyingSubmissions.map((sub, idx) => ({
            rank: idx + 1,
            teamId: sub.team._id.toString(),
            teamName: sub.team.name,
            track: sub.team.track || 'General',
            projectTitle: sub.team.projectTitle || '',
            score: sub.aiEvaluation?.totalScore ?? 0,
            summary: sub.aiEvaluation?.summaryForJudges || ''
        }));

        // If PREVIEW ONLY: Return calculated results without writing to DB
        if (isPreview) {
            return NextResponse.json({
                success: true,
                preview: true,
                mode,
                totalEligible,
                qualifyingCount,
                cutoffScore,
                qualifyingTeams: qualifyingTeamsList
            });
        }

        // 5. ATOMIC / SAFE PERSISTENCE
        const now = new Date();

        // Step A: Reset previous shortlist status for ALL teams in this hackathon
        await Team.updateMany(
            { hackathon: hackathon._id },
            {
                $set: {
                    isShortlisted: false,
                    shortlistRank: null,
                    shortlistedAt: null,
                    shortlistRound: 1
                }
            }
        );

        // Step B: Mark all qualifying teams as shortlisted with their persistent rank and timestamp
        for (const item of qualifyingTeamsList) {
            await Team.updateOne(
                { _id: item.teamId },
                {
                    $set: {
                        isShortlisted: true,
                        shortlistRank: item.rank,
                        shortlistedAt: now,
                        shortlistRound: 1
                    }
                }
            );
        }

        // Step C: Update Hackathon status and audit metadata
        hackathon.shortlistingStatus = 'SHORTLISTED';
        hackathon.shortlistLimit = mode === 'OVERALL' ? limit : qualifyingCount;
        hackathon.shortlistingMode = mode;
        hackathon.shortlistedAt = now;
        hackathon.shortlistCount = qualifyingCount;

        if (mode === 'THEME_WISE') {
            hackathon.themeShortlistLimits = Object.entries(themeLimits).map(([theme, l]) => ({
                theme,
                limit: Number(l)
            }));
        }

        await hackathon.save();

        return NextResponse.json({
            success: true,
            preview: false,
            message: `Successfully shortlisted ${qualifyingCount} teams for Round 2.`,
            mode,
            totalEligible,
            qualifyingCount,
            cutoffScore,
            shortlistedAt: now,
            shortlistedTeams: qualifyingTeamsList
        });

    } catch (error: unknown) {
        console.error('Error during shortlisting:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Server error during shortlisting'
        }, { status: 500 });
    }
}

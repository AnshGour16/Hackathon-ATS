import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Team from '@/models/Team';
import Submission from '@/models/Submission';
import Settings from '@/models/Settings';
import Hackathon from '@/models/Hackathon';
import { fetchGithubData } from '@/lib/github';
import { evaluateCodebaseWithGemini } from '@/lib/gemini';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        const body = await req.json();
        const { teamId, githubUrl } = body;

        if (!teamId || !githubUrl) {
            return NextResponse.json({ error: 'Team ID and GitHub URL are required.' }, { status: 400 });
        }

        // 1. Find Team and verify they haven't already submitted
        const team = await Team.findById(teamId);
        if (!team) {
            return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
        }
        if (team.githubUrl) {
            return NextResponse.json({ error: 'This team has already submitted their codebase.' }, { status: 400 });
        }

        // 2. Check if the code phase is actually open for this team's hackathon
        let isPhaseOpen = false;
        let hackathonInfo = null;
        if (team.hackathon) {
            const h = await Hackathon.findById(team.hackathon);
            if (h) {
                isPhaseOpen = h.isCodeSubmissionOpen;
                hackathonInfo = { name: h.name, theme: h.theme, customAiPrompt: h.customAiPrompt };
            }
        }
        if (!isPhaseOpen) {
            const globalSettings = await Settings.findById('global');
            isPhaseOpen = globalSettings?.isCodeSubmissionOpen || false;
        }

        if (!isPhaseOpen) {
            return NextResponse.json({ error: 'Code submission phase is currently locked for this hackathon.' }, { status: 403 });
        }

        // 3. Find the existing Submission for this team
        const submission = await Submission.findOne({ team: teamId });
        if (!submission) {
            return NextResponse.json({ error: 'No presentation submission found for this team. Please upload a Pitch Deck first.' }, { status: 404 });
        }

        // 4. Scrape GitHub Repository
        let githubContext: string | null = null;
        try {
            githubContext = await fetchGithubData(githubUrl);
            if (!githubContext) {
                return NextResponse.json({ error: 'Repository empty or invalid.' }, { status: 400 });
            }
        } catch {
            return NextResponse.json({ error: 'Failed to access the GitHub repository. Make sure its public and the link is correct.' }, { status: 400 });
        }

        // 5. Run the Codebase through Gemini with Hackathon Theme & Criteria
        const aiEvaluation = await evaluateCodebaseWithGemini(githubContext, hackathonInfo);

        // 6. Save the results
        team.githubUrl = githubUrl;
        await team.save();

        // Merge the new code analysis into the existing aiEvaluation object
        if (!submission.aiEvaluation) {
            submission.aiEvaluation = {} as unknown; // Edge case safeguard
        }
        submission.aiEvaluation.githubAnalysis = aiEvaluation.githubAnalysis;
        await submission.save();

        return NextResponse.json({ success: true, message: 'Code processed successfully.' });

    } catch (error: unknown) {
        console.error('API Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Server error'
        }, { status: 500 });
    }
}

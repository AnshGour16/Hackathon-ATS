import connectToDatabase from './mongodb';
import Hackathon, { IHackathon } from '@/models/Hackathon';
import Settings from '@/models/Settings';
import Team from '@/models/Team';
import Submission from '@/models/Submission';

export async function getOrCreateDefaultHackathon(): Promise<IHackathon> {
    await connectToDatabase();

    let hackathon = await Hackathon.findOne({ isActive: true }).sort({ createdAt: 1 });

    if (!hackathon) {
        // Check if there are legacy settings with tracks
        const legacySettings = await Settings.findById('global');

        hackathon = await Hackathon.create({
            name: 'Global Innovation Hackathon 2026',
            slug: 'global-innovation-2026',
            description: 'The flagship multi-track hackathon bringing developers, designers, and innovators together to build scalable AI solutions.',
            theme: 'Generative AI, Autonomous Systems & Real-World Utility',
            customAiPrompt: 'Evaluate submissions with high standards for technical depth, practical utility, and creative architecture. Penalize generic tutorial clones and reward functional prototypes.',
            isCodeSubmissionOpen: legacySettings?.isCodeSubmissionOpen || false,
            blindJudgingEnabled: legacySettings?.blindJudgingEnabled || false,
            tracks: legacySettings?.tracks && legacySettings.tracks.length > 0
                ? legacySettings.tracks
                : [
                    {
                        name: 'General',
                        requiredSlides: ['Problem Statement', 'Solution Architecture', 'Tech Stack', 'Business Impact'],
                        rubrics: [
                            { criterion: 'Innovation', weightage: 10, description: 'Originality, creative design, and competitive differentiation' },
                            { criterion: 'Technical Feasibility', weightage: 10, description: 'Soundness of technology choices, system architecture, and viability' },
                            { criterion: 'Completeness', weightage: 10, description: 'Depth of execution, clear value proposition, and user experience' }
                        ]
                    },
                    {
                        name: 'AI & Agents',
                        requiredSlides: ['Problem Statement', 'Agent Architecture', 'Model & Vector Pipeline', 'Evaluation Metrics'],
                        rubrics: [
                            { criterion: 'AI Novelty', weightage: 10, description: 'Effective orchestration, fine-tuning, RAG, or agentic workflow usage' },
                            { criterion: 'System Architecture', weightage: 10, description: 'Latency handling, context efficiency, and robust failure recovery' },
                            { criterion: 'Real-World Impact', weightage: 10, description: 'Solves an acute pain point with measurable efficiency gains' }
                        ]
                    }
                ],
            isActive: true
        });

        // Migrate any unlinked teams and submissions
        await Team.updateMany({ hackathon: { $exists: false } }, { $set: { hackathon: hackathon._id } });
        await Submission.updateMany({ hackathon: { $exists: false } }, { $set: { hackathon: hackathon._id } });
    }

    return hackathon;
}

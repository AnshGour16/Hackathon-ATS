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
                        name: 'AI & Machine Learning',
                        requiredSlides: ['Problem Statement', 'Model & Agent Architecture', 'Data Pipeline', 'Evaluation & Impact'],
                        rubrics: [
                            { criterion: 'AI Innovation', weightage: 10, description: 'Novel use of LLMs, agentic workflows, computer vision, or multimodal systems' },
                            { criterion: 'Technical Architecture', weightage: 10, description: 'Scalability, latency management, vector search, and robustness' },
                            { criterion: 'Real-World Impact', weightage: 10, description: 'Solves an acute real-world problem with measurable accuracy' }
                        ]
                    },
                    {
                        name: 'FinTech & Web3',
                        requiredSlides: ['Problem Statement', 'System & Security Architecture', 'Financial Flow / Smart Contract', 'Market Feasibility'],
                        rubrics: [
                            { criterion: 'Security & Compliance', weightage: 10, description: 'Transaction safety, fraud prevention, auditability, and data security' },
                            { criterion: 'Business Feasibility', weightage: 10, description: 'Practical business model, user adoption path, and transaction velocity' },
                            { criterion: 'Execution Quality', weightage: 10, description: 'Robust backend, API integrations, and intuitive UX' }
                        ]
                    },
                    {
                        name: 'HealthTech & Bio-Informatics',
                        requiredSlides: ['Clinical / Healthcare Need', 'Solution Architecture', 'Privacy & HIPAA Compliance', 'Patient Outcomes'],
                        rubrics: [
                            { criterion: 'Clinical Relevance', weightage: 10, description: 'Clear healthcare utility, diagnostic accuracy, or care improvements' },
                            { criterion: 'Privacy & Safety', weightage: 10, description: 'Patient data security, HIPAA compliance, and ethical AI safeguards' },
                            { criterion: 'Feasibility', weightage: 10, description: 'Ease of clinical adoption and operational scalability' }
                        ]
                    },
                    {
                        name: 'Smart Cities & Sustainability',
                        requiredSlides: ['Environmental Need', 'IoT / Tech Architecture', 'Sustainability Metrics', 'Deployment Plan'],
                        rubrics: [
                            { criterion: 'Eco & Social Impact', weightage: 10, description: 'Measurable energy, carbon, waste, or urban efficiency impact' },
                            { criterion: 'Engineering Rigor', weightage: 10, description: 'Hardware/IoT telemetry, edge processing, and systems integration' },
                            { criterion: 'Scalability', weightage: 10, description: 'Viability of city-wide or enterprise-level deployment' }
                        ]
                    },
                    {
                        name: 'Open Innovation',
                        requiredSlides: ['Problem Statement', 'Solution Architecture', 'Tech Stack', 'Product Roadmap'],
                        rubrics: [
                            { criterion: 'Creativity & Novelty', weightage: 10, description: 'Originality, competitive differentiation, and out-of-the-box thinking' },
                            { criterion: 'Technical Depth', weightage: 10, description: 'Code architecture, modern tech stack, and execution quality' },
                            { criterion: 'User Experience', weightage: 10, description: 'Intuitive design, user onboarding, and polish' }
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

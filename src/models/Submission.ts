import mongoose, { Schema, Document } from 'mongoose';

export interface ICriterionScore {
    criterion: string;
    score: number;
    reasoning: string;
}

export interface IAIEvaluation {
    totalScore: number;
    summaryForJudges: string;
    criteriaScores: ICriterionScore[];
    missingSections: string[];
    strengths: string[];
    weaknesses: string[];
    plagiarismFlag: boolean;
    plagiarismWarning?: string;
    githubAnalysis?: {
        technicalComplexity: number;
        codeQuality: string;
        commitActivity: string;
    }
}

export interface ISubmission extends Document {
    team: mongoose.Types.ObjectId;
    hackathon?: mongoose.Types.ObjectId;
    fileUrl: string;
    fileName?: string;
    fileFormat?: 'pdf' | 'pptx' | 'ppt' | string;
    slideCount?: number;
    extractedTextLength?: number;
    extractionStatus?: 'SUCCESS' | 'FAILED' | 'EMPTY';
    hasVisualAssets?: boolean;
    extractionError?: string;
    status: 'PENDING' | 'AI_PROCESSING' | 'EVALUATED' | 'FAILED';
    aiEvaluation?: IAIEvaluation;
    judgeFinalScore?: number;
    createdAt: Date;
    updatedAt: Date;
}

const SubmissionSchema: Schema = new Schema({
    team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    hackathon: { type: Schema.Types.ObjectId, ref: 'Hackathon' },
    fileUrl: { type: String, required: true },
    fileName: { type: String },
    fileFormat: { type: String, enum: ['pdf', 'pptx', 'ppt', 'unknown'] },
    slideCount: { type: Number },
    extractedTextLength: { type: Number },
    extractionStatus: { type: String, enum: ['SUCCESS', 'FAILED', 'EMPTY'], default: 'SUCCESS' },
    hasVisualAssets: { type: Boolean, default: false },
    extractionError: { type: String },
    status: {
        type: String,
        enum: ['PENDING', 'AI_PROCESSING', 'EVALUATED', 'FAILED'],
        default: 'PENDING'
    },
    aiEvaluation: {
        totalScore: { type: Number },
        summaryForJudges: { type: String },
        criteriaScores: [{
            criterion: { type: String },
            score: { type: Number },
            reasoning: { type: String }
        }],
        missingSections: [{ type: String }],
        strengths: [{ type: String }],
        weaknesses: [{ type: String }],
        plagiarismFlag: { type: Boolean, default: false },
        plagiarismWarning: { type: String },
        githubAnalysis: {
            technicalComplexity: { type: Number },
            codeQuality: { type: String },
            commitActivity: { type: String }
        }
    },
    judgeFinalScore: { type: Number }
}, { timestamps: true });

export default mongoose.models.Submission || mongoose.model<ISubmission>('Submission', SubmissionSchema);

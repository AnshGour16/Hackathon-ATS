import mongoose, { Schema, Document } from 'mongoose';
import { ITrack } from './Settings';

export interface IHackathon extends Document {
    name: string;
    slug: string;
    description: string;
    theme: string;
    customAiPrompt: string;
    isCodeSubmissionOpen: boolean;
    blindJudgingEnabled: boolean;
    tracks: ITrack[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const HackathonSchema: Schema = new Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    theme: { type: String, default: '' },
    customAiPrompt: { type: String, default: '' },
    isCodeSubmissionOpen: { type: Boolean, default: false },
    blindJudgingEnabled: { type: Boolean, default: false },
    tracks: [{
        name: { type: String, required: true },
        requiredSlides: [{ type: String }],
        rubrics: [{
            criterion: { type: String, required: true },
            weightage: { type: Number, required: true },
            description: { type: String }
        }]
    }],
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.models.Hackathon || mongoose.model<IHackathon>('Hackathon', HackathonSchema);

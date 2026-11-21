import mongoose, { Schema, Document } from 'mongoose';
import { ITrack, IRubric } from './Hackathon';

export type { ITrack, IRubric };

export interface ISettings extends Document {
    isCodeSubmissionOpen: boolean;
    blindJudgingEnabled: boolean;
    tracks: ITrack[];
    createdAt: Date;
    updatedAt: Date;
}

const SettingsSchema: Schema = new Schema({
    _id: { type: String, default: 'global' },
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
    }]
}, { timestamps: true });

export default mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);

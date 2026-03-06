import mongoose, { Schema, Document } from 'mongoose';

export interface ITeamMember {
    name: string;
    department: string;
    rollNo: string;
}

export interface ITeam extends Document {
    name: string;
    track: string;
    problemStatement: string;
    leader: mongoose.Types.ObjectId;
    members: ITeamMember[];
    githubUrl?: string;
    isShortlisted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const TeamSchema: Schema = new Schema({
    name: { type: String, required: true },
    track: { type: String, default: 'General' },
    problemStatement: { type: String, required: true },
    leader: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{
        name: { type: String },
        department: { type: String },
        rollNo: { type: String }
    }],
    githubUrl: { type: String },
    isShortlisted: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.models.Team || mongoose.model<ITeam>('Team', TeamSchema);

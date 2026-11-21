import mongoose, { Schema, Document } from 'mongoose';

export interface ITeamMember {
    name: string;
    email?: string;
    college?: string;
    department?: string;
    rollNo?: string;
}

export interface ITeam extends Document {
    name: string;
    hackathon?: mongoose.Types.ObjectId;
    track: string;
    projectTitle?: string;
    problemStatement: string;
    solutionDescription?: string;
    leader: mongoose.Types.ObjectId;
    leaderPhone?: string;
    college?: string;
    members: ITeamMember[];
    githubUrl?: string;
    isShortlisted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const TeamSchema: Schema = new Schema({
    name: { type: String, required: true },
    hackathon: { type: Schema.Types.ObjectId, ref: 'Hackathon' },
    track: { type: String, default: 'General' },
    projectTitle: { type: String },
    problemStatement: { type: String, required: true },
    solutionDescription: { type: String },
    leader: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    leaderPhone: { type: String },
    college: { type: String },
    members: [{
        name: { type: String },
        email: { type: String },
        college: { type: String },
        department: { type: String },
        rollNo: { type: String }
    }],
    githubUrl: { type: String },
    isShortlisted: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.models.Team || mongoose.model<ITeam>('Team', TeamSchema);

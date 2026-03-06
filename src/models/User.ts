import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    name: string;
    email: string;
    passwordHash?: string;
    role: 'ADMIN' | 'JUDGE' | 'PARTICIPANT';
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema: Schema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String },
    role: {
        type: String,
        enum: ['ADMIN', 'JUDGE', 'PARTICIPANT'],
        default: 'PARTICIPANT'
    },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

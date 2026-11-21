import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Hackathon from '@/models/Hackathon';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await connectToDatabase();

        let hackathon = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            hackathon = await Hackathon.findById(id).lean();
        }
        if (!hackathon) {
            hackathon = await Hackathon.findOne({ slug: id }).lean();
        }

        if (!hackathon) {
            return NextResponse.json({ error: 'Hackathon not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: hackathon });
    } catch (error: unknown) {
        console.error('API Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Server error'
        }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const userRole = (session?.user as { role?: string } | undefined)?.role;
        if (!session || (userRole !== 'ADMIN' && session.user?.email !== 'admin@hackathon.com')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        await connectToDatabase();

        const body = await req.json();

        let hackathon = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            hackathon = await Hackathon.findById(id);
        }
        if (!hackathon) {
            hackathon = await Hackathon.findOne({ slug: id });
        }

        if (!hackathon) {
            return NextResponse.json({ error: 'Hackathon not found' }, { status: 404 });
        }

        if (typeof body.name === 'string' && body.name.trim()) hackathon.name = body.name.trim();
        if (typeof body.slug === 'string' && body.slug.trim()) hackathon.slug = body.slug.trim();
        if (typeof body.description === 'string') hackathon.description = body.description;
        if (typeof body.theme === 'string') hackathon.theme = body.theme;
        if (typeof body.customAiPrompt === 'string') hackathon.customAiPrompt = body.customAiPrompt;
        if (typeof body.isCodeSubmissionOpen === 'boolean') hackathon.isCodeSubmissionOpen = body.isCodeSubmissionOpen;
        if (typeof body.blindJudgingEnabled === 'boolean') hackathon.blindJudgingEnabled = body.blindJudgingEnabled;
        if (typeof body.isActive === 'boolean') hackathon.isActive = body.isActive;
        if (Array.isArray(body.tracks)) hackathon.tracks = body.tracks;

        await hackathon.save();

        return NextResponse.json({
            success: true,
            message: 'Hackathon updated successfully',
            data: hackathon
        });
    } catch (error: unknown) {
        console.error('API Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Server error'
        }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const userRole = (session?.user as { role?: string } | undefined)?.role;
        if (!session || (userRole !== 'ADMIN' && session.user?.email !== 'admin@hackathon.com')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        await connectToDatabase();

        const count = await Hackathon.countDocuments();
        if (count <= 1) {
            return NextResponse.json({ error: 'Cannot delete the only remaining hackathon.' }, { status: 400 });
        }

        await Hackathon.findByIdAndDelete(id);

        return NextResponse.json({ success: true, message: 'Hackathon deleted successfully' });
    } catch (error: unknown) {
        console.error('API Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Server error'
        }, { status: 500 });
    }
}

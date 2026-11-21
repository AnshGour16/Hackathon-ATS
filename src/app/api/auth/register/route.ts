import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import Team from '@/models/Team';
import Hackathon from '@/models/Hackathon';
import { getOrCreateDefaultHackathon } from '@/lib/hackathon-service';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        const body = await req.json();
        const {
            teamName,
            leaderName,
            email,
            password,
            leaderPhone,
            college,
            hackathonId,
            track,
            projectTitle,
            problemStatement,
            solutionDescription,
            members
        } = body;

        // 1. Mandatory Validations
        if (!teamName || !teamName.trim()) {
            return NextResponse.json({ error: 'Team name is required.' }, { status: 400 });
        }
        if (!leaderName || !leaderName.trim()) {
            return NextResponse.json({ error: 'Team leader name is required.' }, { status: 400 });
        }
        if (!email || !email.trim() || !email.includes('@')) {
            return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
        }
        if (!password || password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
        }
        if (!problemStatement || !problemStatement.trim()) {
            return NextResponse.json({ error: 'Problem statement is required.' }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 2. Check if user already exists
        const existingUser = await User.findOne({
            email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') }
        });

        if (existingUser) {
            return NextResponse.json({
                error: 'An account with this email already exists. Please log in to your dashboard.'
            }, { status: 409 });
        }

        // 3. Resolve Hackathon
        let hackathon = null;
        if (hackathonId && hackathonId !== 'ALL') {
            hackathon = await Hackathon.findById(hackathonId);
        }
        if (!hackathon) {
            hackathon = await getOrCreateDefaultHackathon();
        }

        // 4. Check if team name is already taken in this hackathon
        const existingTeam = await Team.findOne({
            hackathon: hackathon._id,
            name: { $regex: new RegExp(`^${teamName.trim()}$`, 'i') }
        });

        if (existingTeam) {
            return NextResponse.json({
                error: `A team named "${teamName}" is already registered for this hackathon. Please choose a unique name.`
            }, { status: 409 });
        }

        // 5. Hash password securely
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 6. Create Team Leader User
        const user = await User.create({
            name: leaderName.trim(),
            email: normalizedEmail,
            passwordHash,
            role: 'PARTICIPANT',
            phone: leaderPhone ? leaderPhone.trim() : undefined,
            college: college ? college.trim() : undefined
        });

        // 7. Format Members Array
        let sanitizedMembers: { name: string; email?: string; college?: string }[] = [];
        if (Array.isArray(members)) {
            sanitizedMembers = members
                .filter(m => m && typeof m.name === 'string' && m.name.trim().length > 0)
                .map(m => ({
                    name: m.name.trim(),
                    email: m.email ? m.email.trim() : undefined,
                    college: m.college ? m.college.trim() : (college ? college.trim() : undefined)
                }));
        }

        // 8. Create Team
        const team = await Team.create({
            name: teamName.trim(),
            hackathon: hackathon._id,
            track: track || 'General',
            projectTitle: projectTitle ? projectTitle.trim() : undefined,
            problemStatement: problemStatement.trim(),
            solutionDescription: solutionDescription ? solutionDescription.trim() : undefined,
            leader: user._id,
            leaderPhone: leaderPhone ? leaderPhone.trim() : undefined,
            college: college ? college.trim() : undefined,
            members: sanitizedMembers,
            isShortlisted: false
        });

        return NextResponse.json({
            success: true,
            message: 'Team registered successfully.',
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role
            },
            teamId: team._id.toString()
        }, { status: 201 });

    } catch (error: unknown) {
        console.error('Registration Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Server error during registration.'
        }, { status: 500 });
    }
}

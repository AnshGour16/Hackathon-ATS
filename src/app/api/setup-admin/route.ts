import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function GET() {
    try {
        await connectToDatabase();

        // Check if an admin already exists
        const adminUser = await User.findOne({ email: 'admin@hackathon.com' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        if (adminUser) {
            // Overwrite bad data if it exists
            adminUser.passwordHash = hashedPassword;
            await adminUser.save();
            return NextResponse.json({ message: 'Admin user already existed but passwordHash was updated. You can log in with admin@hackathon.com and admin123' });
        }

        const newAdmin = new User({
            name: 'Lead Judge (Admin)',
            email: 'admin@hackathon.com',
            passwordHash: hashedPassword,
            role: 'ADMIN'
        });

        await newAdmin.save();

        return NextResponse.json({
            success: true,
            message: 'Default Admin User Created Successfully!',
            credentials: {
                email: 'admin@hackathon.com',
                password: 'admin123'
            }
        });

    } catch (error: unknown) {
        console.error('Admin Setup Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Server error'
        }, { status: 500 });
    }
}

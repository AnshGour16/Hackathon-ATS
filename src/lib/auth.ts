import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import connectToDatabase from "./mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "admin@example.com" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Missing email or password");
                }
                const emailInput = credentials.email.trim().toLowerCase();
                const passwordInput = credentials.password;

                console.log("Authorize Attempt for:", emailInput);
                await connectToDatabase();

                // Find user (case-insensitive)
                let user = await User.findOne({
                    email: { $regex: new RegExp(`^${emailInput}$`, 'i') }
                }).lean() as { _id: string; name: string; email: string; passwordHash?: string; role: string } | null;

                // Auto-seed default admin if logging in with default credentials and user does not exist yet
                if (!user && emailInput === 'admin@hackathon.com' && passwordInput === 'admin123') {
                    console.log("Auto-seeding default admin user...");
                    const salt = await bcrypt.genSalt(10);
                    const hashedPassword = await bcrypt.hash('admin123', salt);
                    const newAdmin = await User.create({
                        name: 'Lead Judge (Admin)',
                        email: 'admin@hackathon.com',
                        passwordHash: hashedPassword,
                        role: 'ADMIN'
                    });
                    user = {
                        _id: newAdmin._id.toString(),
                        name: newAdmin.name,
                        email: newAdmin.email,
                        passwordHash: newAdmin.passwordHash,
                        role: newAdmin.role
                    };
                }

                if (!user) {
                    console.log("User not found!");
                    throw new Error("Invalid credentials");
                }

                console.log("User found, checking password...");

                // Compare pass (bcrypt or plaintext fallback)
                let isMatch = false;
                if (user.passwordHash) {
                    try {
                        isMatch = await bcrypt.compare(passwordInput, user.passwordHash);
                    } catch {
                        isMatch = false;
                    }
                    if (!isMatch && user.passwordHash === passwordInput) {
                        isMatch = true;
                    }
                }

                // If logging in as admin with default password, always self-heal / update password hash
                if (!isMatch && emailInput === 'admin@hackathon.com' && passwordInput === 'admin123') {
                    console.log("Resetting admin password hash to default...");
                    const salt = await bcrypt.genSalt(10);
                    const newHash = await bcrypt.hash('admin123', salt);
                    await User.updateOne({ _id: user._id }, { $set: { passwordHash: newHash } });
                    isMatch = true;
                }

                if (!isMatch) {
                    console.log("Password mismatch!");
                    throw new Error("Invalid credentials");
                }

                console.log("Login successful!");

                // Return user object for session
                return {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role
                };
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as { role?: string }).role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as { id?: string; role?: string; name?: string | null; email?: string | null; image?: string | null }).id = token.id as string;
                (session.user as { id?: string; role?: string; name?: string | null; email?: string | null; image?: string | null }).role = token.role as string;
            }
            return session;
        }
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt"
    },
    secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_development"
};

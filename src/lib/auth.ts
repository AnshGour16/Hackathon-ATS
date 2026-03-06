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
                console.log("Authorize Attempt for:", credentials.email);
                await connectToDatabase();

                // Find user
                const user = await User.findOne({ email: credentials.email }).lean();

                if (!user) {
                    console.log("User not found!");
                    throw new Error("Invalid credentials");
                }

                console.log("User found, checking password...");

                // Compare pass
                const isMatch = await bcrypt.compare(credentials.password, user.passwordHash as string);

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

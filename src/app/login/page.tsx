'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Lock, User, Shield, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loginRole, setLoginRole] = useState<'PARTICIPANT' | 'ADMIN'>('PARTICIPANT');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const res = await signIn('credentials', {
            redirect: false,
            email,
            password,
        });

        if (res?.error) {
            const msg =
                res.error === 'CredentialsSignin' || res.error === 'Invalid credentials'
                    ? 'Invalid email or password'
                    : `Authentication failed: ${res.error}`;
            setError(msg);
            setIsLoading(false);
        } else {
            try {
                const sessionRes = await fetch('/api/auth/session');
                const sessionData = await sessionRes.json();
                const role = sessionData?.user?.role;
                const from = searchParams.get('from');

                if (from) {
                    router.push(from);
                } else if (role === 'ADMIN' || role === 'JUDGE') {
                    router.push('/admin');
                } else {
                    router.push('/dashboard');
                }
                router.refresh();
            } catch {
                router.push('/dashboard');
            }
        }
    };

    return (
        <Card className="w-full max-w-md shadow-2xl border-primary/20 bg-background/60 backdrop-blur-xl relative z-10">
            <CardHeader className="text-center pb-5">
                <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-3">
                    <Lock className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight">Portal Sign In</CardTitle>
                <CardDescription>
                    {loginRole === 'PARTICIPANT'
                        ? 'Sign in as a Team Leader to view your submission & status'
                        : 'Sign in with your judge or organizer credentials'}
                </CardDescription>

                {/* Role Switcher Tabs */}
                <div className="flex bg-neutral-900/90 p-1 rounded-lg border border-neutral-800 mt-4">
                    <button
                        type="button"
                        onClick={() => {
                            setLoginRole('PARTICIPANT');
                            setEmail('');
                            setPassword('');
                            setError('');
                        }}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors ${loginRole === 'PARTICIPANT' ? 'bg-primary text-black' : 'text-neutral-400 hover:text-white'}`}
                    >
                        <User className="w-3.5 h-3.5" /> Team Leader
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setLoginRole('ADMIN');
                            setEmail('admin@hackathon.com');
                            setPassword('admin123');
                            setError('');
                        }}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors ${loginRole === 'ADMIN' ? 'bg-primary text-black' : 'text-neutral-400 hover:text-white'}`}
                    >
                        <Shield className="w-3.5 h-3.5" /> Judge / Admin
                    </button>
                </div>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder={loginRole === 'PARTICIPANT' ? 'leader@example.com' : 'admin@hackathon.com'}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-black font-semibold" disabled={isLoading}>
                        {isLoading ? 'Authenticating...' : 'Sign In'}
                    </Button>

                    {loginRole === 'ADMIN' && (
                        <div className="pt-2 text-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setEmail('admin@hackathon.com');
                                    setPassword('admin123');
                                }}
                                className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                            >
                                Auto-fill default Admin credentials
                            </button>
                        </div>
                    )}

                    <div className="pt-4 border-t border-neutral-800 text-center">
                        <p className="text-xs text-neutral-400">
                            Haven&apos;t registered your team yet?{' '}
                            <Link href="/register" className="text-primary hover:underline font-medium inline-flex items-center">
                                Register Team <ArrowRight className="w-3 h-3 ml-0.5" />
                            </Link>
                        </p>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 blur-[120px] pointer-events-none rounded-full" />
            <Suspense fallback={<div className="text-white">Loading...</div>}>
                <LoginForm />
            </Suspense>
        </div>
    );
}

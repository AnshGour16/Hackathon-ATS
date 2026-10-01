'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

export const dynamic = 'force-dynamic';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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
            setError('Invalid email or password');
            setIsLoading(false);
        } else {
            const from = searchParams.get('from') || '/admin';
            router.push(from);
            router.refresh();
        }
    };

    return (
        <Card className="w-full max-w-md shadow-2xl border-primary/20 bg-background/60 backdrop-blur-xl relative z-10">
            <CardHeader className="text-center pb-6">
                <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                    <Lock className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight">Admin Login</CardTitle>
                <CardDescription>Enter your credentials to access the leaderboard</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="judge@hackathon.com"
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

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Authenticating...' : 'Sign In'}
                    </Button>

                    <div className="pt-2 border-t border-white/10 text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setEmail('admin@hackathon.com');
                                setPassword('admin123');
                            }}
                            className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                        >
                            Auto-fill default Admin credentials (admin@hackathon.com / admin123)
                        </button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 blur-[100px] pointer-events-none rounded-full" />
            <Suspense fallback={<div className="text-white text-center z-10 relative">Loading login...</div>}>
                <LoginForm />
            </Suspense>
        </div>
    );
}

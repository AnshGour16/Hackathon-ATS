import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, UploadCloud, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function Navbar() {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as { role?: string } | undefined)?.role;
    const isAdminOrJudge = userRole === 'ADMIN' || userRole === 'JUDGE' || session?.user?.email === 'admin@hackathon.com';

    return (
        <nav className="w-full border-b border-primary/20 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <span className="text-primary font-bold text-xl">A</span>
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white">Hackathon ATS</span>
                </Link>

                <div className="flex gap-4 items-center">
                    <Button asChild variant="ghost" className="text-neutral-300 hover:text-white hover:bg-primary/20">
                        <Link href="/">
                            <UploadCloud className="w-4 h-4 mr-2" />
                            Submit Project
                        </Link>
                    </Button>

                    {session ? (
                        <>
                            {isAdminOrJudge && (
                                <Button asChild variant="ghost" className="text-neutral-300 hover:text-white hover:bg-primary/20">
                                    <Link href="/admin/hackathons">
                                        Hackathons
                                    </Link>
                                </Button>
                            )}
                            <Button asChild variant="default" className="bg-primary hover:bg-primary/80 text-black font-semibold">
                                <Link href={isAdminOrJudge ? '/admin' : '/dashboard'}>
                                    <LayoutDashboard className="w-4 h-4 mr-2" />
                                    {isAdminOrJudge ? 'Admin Dashboard' : 'My Dashboard'}
                                </Link>
                            </Button>
                            <div className="h-6 w-px bg-neutral-800 mx-2" />
                            <div className="flex items-center gap-3">
                                <div className="flex items-center text-sm text-neutral-300">
                                    <UserIcon className="w-4 h-4 mr-1 text-primary" />
                                    {session.user?.name || 'Account'}
                                </div>
                                <Button asChild variant="outline" size="sm" className="border-primary/30 text-white hover:bg-red-500/20 hover:text-red-400">
                                    <Link href="/api/auth/signout">
                                        <LogOut className="w-4 h-4 mr-2" />
                                        Logout
                                    </Link>
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Button asChild variant="default" className="bg-primary hover:bg-primary/90 text-black font-bold">
                                <Link href="/register">
                                    Register Team
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="border-primary/50 text-white hover:bg-primary/20">
                                <Link href="/login">
                                    <LogIn className="w-4 h-4 mr-2" />
                                    Sign In
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}

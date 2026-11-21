'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminSettingsRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/hackathons');
    }, [router]);

    return (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white p-4">
            <div className="animate-spin text-primary w-8 h-8 border-2 border-primary border-t-transparent rounded-full mb-3" />
            <p className="text-neutral-400 text-sm">Redirecting to Event Settings & Themes...</p>
        </div>
    );
}

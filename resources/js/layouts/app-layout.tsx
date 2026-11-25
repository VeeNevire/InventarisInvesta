import { Head } from '@inertiajs/react';
import { MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { AppSidebar } from '@/components/app-sidebar';
import { GuidedTour } from '@/components/guided-tour';
import { XIcon } from '@/components/icons';
import { Toaster } from '@/components/toaster';
import type { BreadcrumbItem } from '@/types';

type AppLayoutProps = {
    title: string;
    breadcrumbs: BreadcrumbItem[];
    children: ReactNode;
};

export default function AppLayout({
    title,
    breadcrumbs,
    children,
}: AppLayoutProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        if (!isMenuOpen) {
            return;
        }

        function handleKey(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsMenuOpen(false);
            }
        }

        document.addEventListener('keydown', handleKey);

        return () => document.removeEventListener('keydown', handleKey);
    }, [isMenuOpen]);

    return (
        <MotionConfig reducedMotion="user">
            <Head>
                <title>{title}</title>
                <link
                    rel="icon"
                    type="image/svg+xml"
                    href="/logo-mark.svg?v=7"
                />
            </Head>
            <div className="relative min-h-screen bg-canvas lg:flex print:block print:min-h-0 print:bg-white">
                <div
                    aria-hidden="true"
                    className="pointer-events-none fixed inset-0 overflow-hidden print:hidden"
                >
                    <div className="absolute -top-40 right-[-10%] size-[560px] rounded-full bg-brand-200/40 blur-3xl" />
                    <div className="absolute top-[30%] right-[-14%] size-[420px] rounded-full bg-mint-300/40 blur-3xl" />
                    <div className="absolute bottom-[-20%] left-[20%] size-[480px] rounded-full bg-accent-100/40 blur-3xl" />
                </div>

                <aside className="relative z-10 hidden w-[264px] shrink-0 border-r border-ink-200/70 bg-white/85 backdrop-blur-xl lg:block print:hidden">
                    <div className="sticky top-0 h-screen overflow-y-auto">
                        <AppSidebar />
                    </div>
                </aside>

                {isMenuOpen && (
                    <div className="fixed inset-0 z-40 lg:hidden">
                        <button
                            type="button"
                            aria-label="Tutup menu"
                            className="absolute inset-0 bg-ink-900/30 backdrop-blur-[2px]"
                            onClick={() => setIsMenuOpen(false)}
                        />
                        <div className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] overflow-y-auto bg-white shadow-2xl">
                            <button
                                type="button"
                                aria-label="Tutup menu"
                                onClick={() => setIsMenuOpen(false)}
                                className="absolute top-5 right-4 z-10 flex size-9 items-center justify-center rounded-lg bg-ink-50 text-ink-700 hover:bg-ink-100"
                            >
                                <XIcon className="size-4" />
                            </button>
                            <AppSidebar
                                onNavigate={() => setIsMenuOpen(false)}
                            />
                        </div>
                    </div>
                )}

                <div className="relative z-0 flex min-w-0 flex-1 flex-col">
                    <div className="sticky top-0 z-30 border-b border-ink-200/60 bg-canvas/75 backdrop-blur-xl print:hidden">
                        <div className="mx-auto w-full max-w-[1400px] px-4 py-3 sm:px-6 lg:px-8">
                            <AppHeader
                                breadcrumbs={breadcrumbs}
                                onOpenMenu={() => setIsMenuOpen(true)}
                            />
                        </div>
                    </div>
                    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 print:max-w-none print:p-0">
                        {children}
                    </main>
                </div>
            </div>
            <Toaster />
            <GuidedTour />
        </MotionConfig>
    );
}

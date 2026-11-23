import { Head } from '@inertiajs/react';
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
        <>
            <Head>
                <title>{title}</title>
                <link rel="icon" type="image/png" href="/logo-mark.png?v=3" />
            </Head>
            <div className="min-h-screen bg-[radial-gradient(120%_80%_at_0%_0%,#f4f7fc_0%,#e9eff8_55%,#e3eaf5_100%)] lg:flex print:block print:min-h-0 print:bg-white print:bg-none">
                <aside className="hidden w-[272px] shrink-0 lg:block print:hidden">
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
                        <div className="absolute inset-y-0 left-0 w-[288px] max-w-[85vw] overflow-y-auto bg-canvas shadow-2xl">
                            <button
                                type="button"
                                aria-label="Tutup menu"
                                onClick={() => setIsMenuOpen(false)}
                                className="absolute top-6 right-4 z-10 flex size-9 items-center justify-center rounded-lg bg-white text-ink-700"
                            >
                                <XIcon className="size-4" />
                            </button>
                            <AppSidebar
                                onNavigate={() => setIsMenuOpen(false)}
                            />
                        </div>
                    </div>
                )}

                <div className="min-w-0 flex-1 p-2 sm:p-3 lg:py-3 lg:pr-3 lg:pl-0 print:p-0">
                    <div className="flex min-h-[calc(100vh-1.5rem)] flex-col gap-6 rounded-[28px] border border-white/80 bg-panel/85 px-4 py-5 shadow-[0_1px_2px_rgba(18,24,38,0.04),0_24px_48px_-24px_rgba(30,45,90,0.18)] backdrop-blur-sm sm:px-6 lg:px-8 lg:py-6 print:min-h-0 print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none print:backdrop-blur-none">
                        <div className="print:hidden">
                            <AppHeader
                                breadcrumbs={breadcrumbs}
                                onOpenMenu={() => setIsMenuOpen(true)}
                            />
                        </div>
                        <main className="flex flex-col gap-6">{children}</main>
                    </div>
                </div>
            </div>
            <Toaster />
            <GuidedTour />
        </>
    );
}

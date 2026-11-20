import { router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { AlertIcon, PackageCheckIcon, XIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

type Toast = { type: 'success' | 'error'; message: string };

const VISIBLE_FOR_MS = 5000;

/**
 * Shows the `toast` flash message sent by the server after an action.
 */
export function Toaster() {
    const initialToast = usePage().flash.toast ?? null;
    const [toast, setToast] = useState<Toast | null>(initialToast);

    useEffect(() => {
        return router.on('flash', (event) => {
            const flashed = event.detail.flash.toast;

            if (flashed) {
                setToast(flashed);
            }
        });
    }, []);

    useEffect(() => {
        if (!toast) {
            return;
        }

        const timeout = window.setTimeout(() => setToast(null), VISIBLE_FOR_MS);

        return () => window.clearTimeout(timeout);
    }, [toast]);

    if (!toast) {
        return null;
    }

    const isError = toast.type === 'error';
    const Icon = isError ? AlertIcon : PackageCheckIcon;

    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed right-4 bottom-4 z-50 flex w-[min(26rem,calc(100vw-2rem))] items-start gap-3 rounded-2xl border border-ink-200 bg-white p-4 shadow-xl print:hidden"
        >
            <span
                className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-xl',
                    isError ? 'bg-low/10 text-low' : 'bg-ok/10 text-ok',
                )}
            >
                <Icon className="size-[18px]" />
            </span>
            <p className="flex-1 pt-1.5 text-sm text-ink-900">
                {toast.message}
            </p>
            <button
                type="button"
                onClick={() => setToast(null)}
                aria-label="Tutup pesan"
                className="flex size-8 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100"
            >
                <XIcon className="size-4" />
            </button>
        </div>
    );
}

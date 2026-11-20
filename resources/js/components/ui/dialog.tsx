import type { ReactNode } from 'react';
import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

type DialogProps = {
    open: boolean;
    onClose: () => void;
    title: string;
    description?: ReactNode;
    icon?: ReactNode;
    size?: 'md' | 'lg';
    children: ReactNode;
};

/**
 * Modal with a fixed header. Only the body scrolls, and a `DialogFooter`
 * inside it stays pinned to the bottom, so the title and buttons are always
 * visible on short screens.
 */
export function Dialog({
    open,
    onClose,
    title,
    description,
    icon,
    size = 'md',
    children,
}: DialogProps) {
    const titleId = useId();

    useEffect(() => {
        if (!open) {
            return;
        }

        function handleKey(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleKey);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKey);
        };
    }, [open, onClose]);

    if (!open || typeof document === 'undefined') {
        return null;
    }

    // Rendered into <body> so no ancestor with a filter or transform turns
    // "fixed" into "relative to that ancestor" and pushes the dialog off-screen.
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
            <button
                type="button"
                aria-label="Tutup"
                onClick={onClose}
                className="absolute inset-0 bg-ink-900/45 backdrop-blur-[3px]"
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className={cn(
                    'relative flex max-h-[calc(100dvh-1rem)] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_32px_64px_-24px_rgba(18,24,38,0.45)] sm:max-h-[calc(100dvh-3rem)] sm:rounded-[28px]',
                    size === 'lg' ? 'sm:max-w-xl' : 'sm:max-w-md',
                )}
            >
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-ink-100 px-6 pt-5 pb-4">
                    <div className="flex min-w-0 items-start gap-3.5">
                        {icon}
                        <div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
                            <h2
                                id={titleId}
                                className="text-[17px] font-semibold tracking-[-0.01em] text-ink-900"
                            >
                                {title}
                            </h2>
                            {description && (
                                <p className="text-[13px] leading-relaxed text-ink-500">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Tutup"
                        className="-mt-1 -mr-2 flex size-9 shrink-0 items-center justify-center rounded-xl text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                    >
                        <XIcon className="size-[18px]" />
                    </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-5">
                    {children}
                </div>
            </div>
        </div>,
        document.body,
    );
}

/**
 * Action row pinned to the bottom of a dialog while its body scrolls.
 */
export function DialogFooter({ children }: { children: ReactNode }) {
    return (
        <div className="sticky bottom-0 z-10 -mx-6 mt-1 flex justify-end gap-3 border-t border-ink-100 bg-white px-6 py-4">
            {children}
        </div>
    );
}

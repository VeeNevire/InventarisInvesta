import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type CardProps = {
    children: ReactNode;
    className?: string;
};

export function Card({ children, className }: CardProps) {
    return (
        <section
            className={cn(
                'rounded-2xl border border-ink-200/60 bg-white shadow-[0_1px_2px_rgba(23,33,31,0.04),0_12px_32px_-18px_rgba(23,82,131,0.18)]',
                className,
            )}
        >
            {children}
        </section>
    );
}

type CardHeaderProps = {
    title: string;
    description?: ReactNode;
    action?: ReactNode;
};

export function CardHeader({ title, description, action }: CardHeaderProps) {
    return (
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
            <div className="flex min-w-0 flex-col gap-1">
                <h2 className="text-base font-semibold text-ink-900">
                    {title}
                </h2>
                {description && (
                    <p className="text-[13px] text-ink-500">{description}</p>
                )}
            </div>
            {action}
        </div>
    );
}

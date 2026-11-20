import type { ReactNode } from 'react';

type PageHeaderProps = {
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
    eyebrow?: ReactNode;
};

export function PageHeader({
    title,
    description,
    actions,
    eyebrow,
}: PageHeaderProps) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-ink-200 pb-6">
            <div className="flex min-w-0 flex-col gap-1.5">
                {eyebrow}
                <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.02em] text-balance text-ink-900 sm:text-[32px]">
                    {title}
                </h1>
                {description && (
                    <p className="text-[15px] text-ink-500">{description}</p>
                )}
            </div>
            {actions && (
                <div className="flex flex-wrap items-center gap-3">
                    {actions}
                </div>
            )}
        </div>
    );
}

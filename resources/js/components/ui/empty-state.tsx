import type { ReactNode } from 'react';
import { BoxIcon } from '@/components/icons';

type EmptyStateProps = {
    title: string;
    description?: ReactNode;
    action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <BoxIcon />
            </span>
            <div className="flex flex-col gap-1">
                <p className="font-semibold text-ink-900">{title}</p>
                {description && (
                    <p className="max-w-sm text-sm text-ink-500">
                        {description}
                    </p>
                )}
            </div>
            {action}
        </div>
    );
}

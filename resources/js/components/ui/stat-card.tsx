import type { ComponentType, ReactNode, SVGProps } from 'react';
import { cn } from '@/lib/utils';

type StatCardProps = {
    label: string;
    value: ReactNode;
    hint?: ReactNode;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    tone?: 'brand' | 'red' | 'green' | 'amber';
};

const iconTones = {
    brand: 'bg-brand-50 text-brand-700',
    red: 'bg-low/10 text-low',
    green: 'bg-ok/10 text-ok',
    amber: 'bg-service/10 text-service',
};

export function StatCard({
    label,
    value,
    hint,
    icon: Icon,
    tone = 'brand',
}: StatCardProps) {
    // Construct an accessible label combining label and value
    const ariaLabel = `${label}: ${typeof value === 'string' ? value : ''}`;
    return (
        <div
            className="flex flex-col gap-4 rounded-2xl border border-white bg-white p-5 shadow-[0_1px_2px_rgba(18,24,38,0.04),0_8px_24px_-12px_rgba(18,24,38,0.08)]"
            tabIndex={0}
            aria-label={ariaLabel}
            role="region"
        >
            <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] font-medium text-ink-500">
                    {label}
                </span>
                <span
                    className={cn(
                        'flex size-9 items-center justify-center rounded-xl',
                        iconTones[tone],
                    )}
                >
                    <Icon className="size-[18px]" />
                </span>
            </div>
            <div className="flex flex-col gap-1">
                <span className="text-[26px] leading-none font-semibold tracking-[-0.02em] text-ink-900 tabular-nums">
                    {value}
                </span>
                {hint && (
                    <span className="text-[13px] text-ink-600">{hint}</span>
                )}
            </div>
        </div>
    );
}


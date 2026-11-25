import type { ComponentType, ReactNode, SVGProps } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'brand' | 'red' | 'green' | 'amber' | 'coral' | 'sun';

type StatCardProps = {
    label: string;
    value: ReactNode;
    hint?: ReactNode;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    tone?: Tone;
    /** Optional 0–100 fill shown as a slim meter under the value. */
    progress?: number;
};

const tones: Record<Tone, { icon: string; glow: string; meter: string }> = {
    brand: {
        icon: 'bg-gradient-to-br from-brand-700 to-brand-500 text-white',
        glow: 'bg-brand-200/60',
        meter: 'bg-gradient-to-r from-brand-600 to-brand-500',
    },
    red: {
        icon: 'bg-gradient-to-br from-low to-accent-500 text-white',
        glow: 'bg-low/20',
        meter: 'bg-low',
    },
    green: {
        icon: 'bg-gradient-to-br from-brand-900 to-brand-600 text-white',
        glow: 'bg-brand-300/30',
        meter: 'bg-gradient-to-r from-brand-800 to-brand-500',
    },
    amber: {
        icon: 'bg-gradient-to-br from-service to-sun-400 text-white',
        glow: 'bg-sun-400/30',
        meter: 'bg-service',
    },
    coral: {
        icon: 'bg-gradient-to-br from-accent-600 to-accent-400 text-white',
        glow: 'bg-accent-200/60',
        meter: 'bg-accent-500',
    },
    sun: {
        icon: 'bg-gradient-to-br from-sun-500 to-sun-400 text-white',
        glow: 'bg-sun-400/30',
        meter: 'bg-sun-400',
    },
};

export function StatCard({
    label,
    value,
    hint,
    icon: Icon,
    tone = 'brand',
    progress,
}: StatCardProps) {
    const ariaLabel = `${label}: ${typeof value === 'string' ? value : ''}`;
    const palette = tones[tone];

    return (
        <div
            className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-ink-200/60 bg-white p-5 shadow-[0_1px_2px_rgba(23,33,31,0.04),0_12px_32px_-18px_rgba(23,82,131,0.18)] transition-transform hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
            tabIndex={0}
            aria-label={ariaLabel}
            role="region"
        >
            <span
                aria-hidden="true"
                className={cn(
                    'pointer-events-none absolute -top-10 -right-10 size-32 rounded-full blur-2xl',
                    palette.glow,
                )}
            />
            <div className="relative flex items-center justify-between gap-3">
                <span className="text-[13px] font-medium text-ink-500">
                    {label}
                </span>
                <span
                    className={cn(
                        'flex size-10 items-center justify-center rounded-xl shadow-[0_6px_14px_-6px_rgba(23,33,31,0.35)]',
                        palette.icon,
                    )}
                >
                    <Icon className="size-5" />
                </span>
            </div>
            <div className="relative flex flex-col gap-1.5">
                <span className="text-[28px] leading-none font-bold tracking-[-0.02em] text-ink-900 tabular-nums">
                    {value}
                </span>
                {progress !== undefined && (
                    <span className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
                        <span
                            className={cn(
                                'block h-full rounded-full',
                                palette.meter,
                            )}
                            style={{
                                width: `${Math.max(0, Math.min(100, progress))}%`,
                            }}
                        />
                    </span>
                )}
                {hint && (
                    <span className="text-[13px] text-ink-600">{hint}</span>
                )}
            </div>
        </div>
    );
}

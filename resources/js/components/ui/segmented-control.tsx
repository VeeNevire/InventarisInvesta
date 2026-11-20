import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Segment<T extends string> = {
    value: T;
    label: ReactNode;
    count?: number;
};

type SegmentedControlProps<T extends string> = {
    label: string;
    value: T;
    onChange: (value: T) => void;
    segments: Segment<T>[];
};

export function SegmentedControl<T extends string>({
    label,
    value,
    onChange,
    segments,
}: SegmentedControlProps<T>) {
    return (
        <div
            role="group"
            aria-label={label}
            className="flex max-w-full flex-wrap gap-1.5"
        >
            {segments.map((segment) => {
                const isActive = segment.value === value;

                return (
                    <button
                        key={segment.value}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => onChange(segment.value)}
                        className={cn(
                            'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                            isActive
                                ? 'border-brand-700 bg-brand-700 text-white'
                                : 'border-ink-200 bg-white text-ink-700 hover:border-ink-400',
                        )}
                    >
                        {segment.label}
                        {segment.count !== undefined && (
                            <span
                                className={cn(
                                    'rounded px-1.5 text-[11px] font-semibold tabular-nums',
                                    isActive
                                        ? 'bg-white/20 text-white'
                                        : 'bg-ink-100 text-ink-500',
                                )}
                            >
                                {segment.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

import { useState } from 'react';
import { formatMonth, formatRupiah, formatRupiahCompact } from '@/lib/format';
import { cn } from '@/lib/utils';

export type MonthlyMovement = {
    month: string;
    incoming: number;
    outgoing: number;
};

const series = [
    { key: 'incoming', label: 'Nilai masuk', color: 'bg-series-in' },
    { key: 'outgoing', label: 'Nilai keluar', color: 'bg-series-out' },
] as const;

/**
 * Grouped bars of goods value in vs out per month, on one rupiah axis.
 */
export function MovementChart({ data }: { data: MonthlyMovement[] }) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const maxValue = Math.max(
        1,
        ...data.flatMap((month) => [month.incoming, month.outgoing]),
    );
    const step = niceStep(maxValue / 4);
    const top = Math.ceil(maxValue / step) * step;
    const ticks = Array.from(
        { length: Math.round(top / step) + 1 },
        (_, index) => index * step,
    ).reverse();
    const active = activeIndex !== null ? data[activeIndex] : null;

    return (
        <div className="flex flex-col gap-4 px-5 pb-5">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-700">
                {series.map((item) => (
                    <span key={item.key} className="flex items-center gap-2">
                        <span
                            className={cn('size-2.5 rounded-sm', item.color)}
                        />
                        {item.label}
                    </span>
                ))}
            </div>

            <div className="relative flex h-60 gap-3">
                <div className="flex flex-col justify-between pb-6 text-right text-[11px] text-ink-500 tabular-nums">
                    {ticks.map((tick) => (
                        <span key={tick} className="leading-none">
                            {formatRupiahCompact(tick)}
                        </span>
                    ))}
                </div>

                <div className="relative flex-1">
                    <div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
                        {ticks.map((tick) => (
                            <span
                                key={tick}
                                className={cn(
                                    'h-px w-full',
                                    tick === 0 ? 'bg-ink-200' : 'bg-ink-100',
                                )}
                            />
                        ))}
                    </div>

                    <div className="absolute inset-0 flex">
                        {data.map((month, index) => (
                            <button
                                key={month.month}
                                type="button"
                                onMouseEnter={() => setActiveIndex(index)}
                                onMouseLeave={() => setActiveIndex(null)}
                                onFocus={() => setActiveIndex(index)}
                                onBlur={() => setActiveIndex(null)}
                                aria-label={`${formatMonth(month.month, true)}: masuk ${formatRupiah(month.incoming)}, keluar ${formatRupiah(month.outgoing)}`}
                                className={cn(
                                    'group flex flex-1 flex-col items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                                    activeIndex === index && 'bg-brand-50/60',
                                )}
                            >
                                <span className="flex w-full flex-1 items-end justify-center gap-[2px] px-[18%]">
                                    {series.map((item) => (
                                        <span
                                            key={item.key}
                                            style={{
                                                height: `${(month[item.key] / top) * 100}%`,
                                            }}
                                            className={cn(
                                                'w-full max-w-5 rounded-t-[4px] transition-opacity',
                                                item.color,
                                                activeIndex !== null &&
                                                    activeIndex !== index &&
                                                    'opacity-40',
                                            )}
                                        />
                                    ))}
                                </span>
                                <span className="flex h-6 items-end text-[12px] text-ink-500">
                                    {formatMonth(month.month)}
                                </span>
                            </button>
                        ))}
                    </div>

                    {active && activeIndex !== null && (
                        <div
                            className="pointer-events-none absolute top-2 z-10 w-48 -translate-x-1/2 rounded-xl border border-ink-200 bg-white p-3 shadow-lg"
                            style={{
                                left: `${Math.min(85, Math.max(15, ((activeIndex + 0.5) / data.length) * 100))}%`,
                            }}
                        >
                            <p className="text-xs font-semibold text-ink-900">
                                {formatMonth(active.month, true)}
                            </p>
                            <dl className="mt-2 flex flex-col gap-1.5 text-xs">
                                {series.map((item) => (
                                    <div
                                        key={item.key}
                                        className="flex items-center justify-between gap-3"
                                    >
                                        <dt className="flex items-center gap-1.5 text-ink-500">
                                            <span
                                                className={cn(
                                                    'size-2 rounded-sm',
                                                    item.color,
                                                )}
                                            />
                                            {item.label}
                                        </dt>
                                        <dd className="font-semibold text-ink-900 tabular-nums">
                                            {formatRupiah(active[item.key])}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    )}
                </div>
            </div>

            <table className="sr-only">
                <caption>Nilai barang masuk dan keluar per bulan</caption>
                <thead>
                    <tr>
                        <th>Bulan</th>
                        <th>Masuk</th>
                        <th>Keluar</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((month) => (
                        <tr key={month.month}>
                            <td>{formatMonth(month.month, true)}</td>
                            <td>{formatRupiah(month.incoming)}</td>
                            <td>{formatRupiah(month.outgoing)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function niceStep(rough: number): number {
    const exponent = Math.floor(Math.log10(rough));
    const base = 10 ** exponent;
    const fraction = rough / base;
    const nice =
        fraction <= 1
            ? 1
            : fraction <= 2
              ? 2
              : fraction <= 2.5
                ? 2.5
                : fraction <= 5
                  ? 5
                  : 10;

    return nice * base;
}

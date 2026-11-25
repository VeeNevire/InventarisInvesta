import { useRemember } from '@inertiajs/react';
import { ChevronRightIcon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

export const PER_PAGE_OPTIONS = [10, 25, 50] as const;

type PaginatedRows<T> = {
    rows: T[];
    page: number;
    perPage: number;
    pageCount: number;
    total: number;
    from: number;
    to: number;
    setPage: (page: number) => void;
    setPerPage: (perPage: number) => void;
};

/**
 * Splits an already-loaded list into pages. The page is remembered in the
 * browser history (so "Back" from a detail page returns to it) and goes back
 * to page 1 whenever `resetKey` changes, e.g. when a filter is applied.
 */
export function usePaginatedRows<T>(
    rows: T[],
    rememberKey: string,
    resetKey = '',
): PaginatedRows<T> {
    const [state, setState] = useRemember(
        { page: 1, perPage: 10, resetKey },
        `pagination:${rememberKey}`,
    );

    const perPage = state.perPage;
    const pageCount = Math.max(1, Math.ceil(rows.length / perPage));
    const requestedPage = state.resetKey === resetKey ? state.page : 1;
    const page = Math.min(Math.max(requestedPage, 1), pageCount);
    const start = (page - 1) * perPage;

    return {
        rows: rows.slice(start, start + perPage),
        page,
        perPage,
        pageCount,
        total: rows.length,
        from: rows.length === 0 ? 0 : start + 1,
        to: Math.min(start + perPage, rows.length),
        setPage: (next) => {
            setState({ page: next, perPage, resetKey });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        setPerPage: (next) => setState({ page: 1, perPage: next, resetKey }),
    };
}

type PaginationProps = {
    page: number;
    pageCount: number;
    total: number;
    from: number | null;
    to: number | null;
    onPageChange: (page: number) => void;
    /** What one row is called, e.g. "barang" or "karyawan". */
    noun: string;
    perPage?: number;
    onPerPageChange?: (perPage: number) => void;
    className?: string;
};

/**
 * Page numbers with previous/next buttons and an optional rows-per-page choice.
 * Hidden when everything fits on the smallest page size.
 */
export function Pagination({
    page,
    pageCount,
    total,
    from,
    to,
    onPageChange,
    noun,
    perPage,
    onPerPageChange,
    className,
}: PaginationProps) {
    if (total <= PER_PAGE_OPTIONS[0] && pageCount <= 1) {
        return null;
    }

    function goTo(next: number) {
        if (next < 1 || next > pageCount || next === page) {
            return;
        }

        onPageChange(next);
    }

    const arrowClass =
        'flex size-9 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-600 transition-colors hover:border-brand-300 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:pointer-events-none disabled:opacity-40';

    return (
        <nav
            aria-label="Halaman"
            className={cn(
                'flex flex-col gap-3 rounded-2xl border border-ink-200/60 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(23,33,31,0.04)] sm:flex-row sm:items-center sm:justify-between',
                className,
            )}
        >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-500">
                <span>
                    Menampilkan{' '}
                    <strong className="font-semibold text-ink-900 tabular-nums">
                        {formatNumber(from ?? 0)}–{formatNumber(to ?? 0)}
                    </strong>{' '}
                    dari{' '}
                    <strong className="font-semibold text-ink-900 tabular-nums">
                        {formatNumber(total)}
                    </strong>{' '}
                    {noun}
                </span>
                {perPage !== undefined && onPerPageChange && (
                    <label className="flex items-center gap-2">
                        <span>Baris per halaman</span>
                        <select
                            value={perPage}
                            onChange={(event) =>
                                onPerPageChange(Number(event.target.value))
                            }
                            className="h-8 rounded-lg border border-ink-200 bg-white px-2 text-[13px] font-semibold text-ink-900 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                        >
                            {PER_PAGE_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </label>
                )}
            </div>

            {pageCount > 1 && (
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => goTo(page - 1)}
                        disabled={page <= 1}
                        aria-label="Halaman sebelumnya"
                        className={arrowClass}
                    >
                        <ChevronRightIcon className="size-4 rotate-180" />
                    </button>
                    {pageNumbers(page, pageCount).map((number, index) =>
                        number === null ? (
                            <span
                                key={`gap-${index}`}
                                aria-hidden="true"
                                className="w-6 text-center text-ink-400"
                            >
                                …
                            </span>
                        ) : (
                            <button
                                key={number}
                                type="button"
                                onClick={() => goTo(number)}
                                aria-current={
                                    number === page ? 'page' : undefined
                                }
                                aria-label={`Halaman ${number}`}
                                className={cn(
                                    'flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-[13px] font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                                    number === page
                                        ? 'bg-brand-700 text-white shadow-[0_6px_14px_-6px_rgba(22,121,201,0.7)]'
                                        : 'text-ink-600 hover:bg-brand-50 hover:text-brand-700',
                                )}
                            >
                                {number}
                            </button>
                        ),
                    )}
                    <button
                        type="button"
                        onClick={() => goTo(page + 1)}
                        disabled={page >= pageCount}
                        aria-label="Halaman berikutnya"
                        className={arrowClass}
                    >
                        <ChevronRightIcon className="size-4" />
                    </button>
                </div>
            )}
        </nav>
    );
}

/**
 * Page numbers to show, with `null` marking a gap: 1 … 4 5 6 … 12.
 */
function pageNumbers(page: number, pageCount: number): (number | null)[] {
    if (pageCount <= 7) {
        return Array.from({ length: pageCount }, (_, index) => index + 1);
    }

    const numbers: (number | null)[] = [1];
    const start = Math.max(2, page - 1);
    const end = Math.min(pageCount - 1, page + 1);

    if (start > 2) {
        numbers.push(null);
    }

    for (let number = start; number <= end; number++) {
        numbers.push(number);
    }

    if (end < pageCount - 1) {
        numbers.push(null);
    }

    numbers.push(pageCount);

    return numbers;
}

/**
 * `Pagination` wired to a list split by `usePaginatedRows`.
 */
export function ListPagination<T>({
    paginated,
    noun,
}: {
    paginated: PaginatedRows<T>;
    noun: string;
}) {
    return (
        <Pagination
            page={paginated.page}
            pageCount={paginated.pageCount}
            total={paginated.total}
            from={paginated.from}
            to={paginated.to}
            onPageChange={paginated.setPage}
            perPage={paginated.perPage}
            onPerPageChange={paginated.setPerPage}
            noun={noun}
        />
    );
}

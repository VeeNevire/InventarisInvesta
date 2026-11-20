import type { ReactNode } from 'react';

export const inputClasses =
    'h-11 w-full rounded-xl border border-ink-200 bg-white px-3.5 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-500 focus:ring-3 focus:ring-brand-100 aria-invalid:border-low disabled:bg-ink-50 disabled:text-ink-500';

type FieldProps = {
    label: string;
    htmlFor: string;
    hint?: ReactNode;
    error?: string;
    children: ReactNode;
};

export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
                <label
                    htmlFor={htmlFor}
                    className="text-sm font-medium text-ink-700"
                >
                    {label}
                </label>
                {hint && <span className="text-xs text-ink-500">{hint}</span>}
            </div>
            {children}
            {error && <p className="text-sm text-[#c52c32]">{error}</p>}
        </div>
    );
}

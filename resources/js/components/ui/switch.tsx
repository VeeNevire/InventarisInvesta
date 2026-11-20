import { cn } from '@/lib/utils';

type SwitchProps = {
    id: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    disabled?: boolean;
};

export function Switch({ id, checked, onChange, label, disabled }: SwitchProps) {
    return (
        <label
            htmlFor={id}
            className="inline-flex cursor-pointer items-center gap-3 text-sm font-medium text-ink-700 select-none"
        >
            {label}
            <button
                id={id}
                type="button"
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={cn(
                    'relative h-6 w-11 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50',
                    checked ? 'bg-brand-600' : 'bg-ink-200',
                )}
            >
                <span
                    className={cn(
                        'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform',
                        checked && 'translate-x-5',
                    )}
                />
            </button>
        </label>
    );
}

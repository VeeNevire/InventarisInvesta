import { SearchIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

type SearchInputProps = {
    id: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    label: string;
    className?: string;
};

/**
 * Search box styled like the reference: an icon tile joined to the input.
 */
export function SearchInput({
    id,
    value,
    onChange,
    placeholder,
    label,
    className,
}: SearchInputProps) {
    return (
        <div
            className={cn(
                'flex h-11 w-full items-stretch overflow-hidden rounded-xl border border-ink-200 bg-white focus-within:border-brand-500 focus-within:ring-3 focus-within:ring-brand-100 sm:w-80',
                className,
            )}
        >
            <label
                htmlFor={id}
                className="flex w-11 items-center justify-center border-r border-ink-200 text-ink-700"
            >
                <SearchIcon className="size-[18px]" />
                <span className="sr-only">{label}</span>
            </label>
            <input
                id={id}
                type="search"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="min-w-0 flex-1 bg-transparent px-3 text-sm text-ink-900 outline-none placeholder:text-ink-400"
            />
        </div>
    );
}

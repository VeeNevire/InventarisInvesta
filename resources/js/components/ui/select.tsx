import type { KeyboardEvent, ReactNode } from 'react';
import { useCallback, useId, useRef, useState } from 'react';
import { CheckIcon, ChevronDownIcon } from '@/components/icons';
import { FloatingList, FloatingOption } from '@/components/ui/floating-list';
import { cn } from '@/lib/utils';

export type SelectOption = {
    value: string;
    label: string;
    description?: string;
    icon?: ReactNode;
    indent?: boolean;
};

type SelectProps = {
    id: string;
    options: SelectOption[];
    /** Field name for plain `<Form>` submissions (a hidden input carries the value). */
    name?: string;
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    invalid?: boolean;
    className?: string;
    'aria-label'?: string;
};

/**
 * Styled replacement for the native select, so dropdowns look the same in
 * every browser and theme. Works controlled (`value`/`onChange`) or inside a
 * plain form (`name`/`defaultValue`).
 */
export function Select({
    id,
    options,
    name,
    value,
    defaultValue = '',
    onChange,
    placeholder = 'Pilih…',
    disabled = false,
    invalid = false,
    className,
    'aria-label': ariaLabel,
}: SelectProps) {
    const [innerValue, setInnerValue] = useState(defaultValue);
    const [isOpen, setIsOpen] = useState(false);
    const [active, setActive] = useState(0);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const listId = useId();

    const current = value ?? innerValue;
    const selected = options.find((option) => option.value === current);

    const close = useCallback(() => setIsOpen(false), []);

    function open() {
        if (disabled) {
            return;
        }

        const index = options.findIndex((option) => option.value === current);
        setActive(index >= 0 ? index : 0);
        setIsOpen(true);
    }

    function choose(option: SelectOption) {
        if (value === undefined) {
            setInnerValue(option.value);
        }

        onChange?.(option.value);
        setIsOpen(false);
        buttonRef.current?.focus();
    }

    function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
        if (!isOpen) {
            if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
                event.preventDefault();
                open();
            }

            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActive((index) => Math.min(index + 1, options.length - 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();

            if (options[active]) {
                choose(options[active]);
            }
        } else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            close();
        } else if (event.key === 'Tab') {
            close();
        } else if (event.key.length === 1) {
            const letter = event.key.toLowerCase();
            const match = options.findIndex((option) =>
                option.label.toLowerCase().startsWith(letter),
            );

            if (match >= 0) {
                setActive(match);
            }
        }
    }

    return (
        <>
            {name && <input type="hidden" name={name} value={current} />}
            <button
                ref={buttonRef}
                id={id}
                type="button"
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-controls={listId}
                aria-invalid={invalid || undefined}
                aria-label={ariaLabel}
                aria-activedescendant={
                    isOpen ? `${listId}-${active}` : undefined
                }
                disabled={disabled}
                onClick={() => (isOpen ? close() : open())}
                onKeyDown={handleKeyDown}
                className={cn(
                    'flex h-11 w-full items-center gap-2 rounded-xl border bg-white px-3.5 text-left text-sm outline-none transition-colors',
                    'focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-100',
                    'disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-500',
                    isOpen
                        ? 'border-brand-500 ring-3 ring-brand-100'
                        : invalid
                          ? 'border-low'
                          : 'border-ink-200 hover:border-ink-400',
                    className,
                )}
            >
                {selected?.icon}
                <span
                    className={cn(
                        'min-w-0 flex-1 truncate',
                        selected ? 'text-ink-900' : 'text-ink-400',
                    )}
                >
                    {selected?.label ?? placeholder}
                </span>
                <ChevronDownIcon
                    className={cn(
                        'size-4 shrink-0 text-ink-500 transition-transform',
                        isOpen && 'rotate-180',
                    )}
                />
            </button>
            <FloatingList
                open={isOpen}
                anchorRef={buttonRef}
                onDismiss={close}
                id={listId}
                label={ariaLabel}
            >
                {options.map((option, index) => (
                    <FloatingOption
                        key={option.value}
                        id={`${listId}-${index}`}
                        active={index === active}
                        selected={option.value === current}
                        onChoose={() => choose(option)}
                        onHover={() => setActive(index)}
                    >
                        {option.indent && (
                            <span
                                aria-hidden="true"
                                className="ml-3 text-ink-400"
                            >
                                └
                            </span>
                        )}
                        {option.icon}
                        {option.indent && (
                            <span className="sr-only">Jenis barang: </span>
                        )}
                        <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate">{option.label}</span>
                            {option.description && (
                                <span className="truncate text-xs font-normal text-ink-500">
                                    {option.description}
                                </span>
                            )}
                        </span>
                        {option.value === current && (
                            <CheckIcon className="size-4 shrink-0 text-brand-700" />
                        )}
                    </FloatingOption>
                ))}
            </FloatingList>
        </>
    );
}

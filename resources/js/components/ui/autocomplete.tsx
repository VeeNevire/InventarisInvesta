import type { KeyboardEvent } from 'react';
import { useCallback, useId, useRef, useState } from 'react';
import { inputClasses } from '@/components/ui/field';
import { FloatingList, FloatingOption } from '@/components/ui/floating-list';
import { cn } from '@/lib/utils';

type AutocompleteProps = {
    id: string;
    options: string[];
    name?: string;
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    autoFocus?: boolean;
    invalid?: boolean;
    className?: string;
};

const MAX_SUGGESTIONS = 8;

/**
 * Free-text input with styled suggestions. Anything may be typed; the list
 * only helps reuse values that already exist.
 */
export function Autocomplete({
    id,
    options,
    name,
    value,
    defaultValue = '',
    onChange,
    placeholder,
    required,
    autoFocus,
    invalid = false,
    className,
}: AutocompleteProps) {
    const [innerValue, setInnerValue] = useState(defaultValue);
    const [isOpen, setIsOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const listId = useId();

    const current = value ?? innerValue;
    const query = current.trim().toLowerCase();
    const suggestions = options
        .filter(
            (option) =>
                option.toLowerCase() !== query &&
                (!query || option.toLowerCase().includes(query)),
        )
        .slice(0, MAX_SUGGESTIONS);

    const close = useCallback(() => setIsOpen(false), []);

    function update(next: string) {
        if (value === undefined) {
            setInnerValue(next);
        }

        onChange?.(next);
    }

    function choose(option: string) {
        update(option);
        setIsOpen(false);
        setActive(-1);
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setIsOpen(true);
            setActive((index) => Math.min(index + 1, suggestions.length - 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
        } else if (event.key === 'Enter' && isOpen && suggestions[active]) {
            event.preventDefault();
            choose(suggestions[active]);
        } else if (event.key === 'Escape' && isOpen) {
            event.preventDefault();
            event.stopPropagation();
            close();
        } else if (event.key === 'Tab') {
            close();
        }
    }

    return (
        <>
            <input
                ref={inputRef}
                id={id}
                name={name}
                value={current}
                onChange={(event) => {
                    update(event.target.value);
                    setIsOpen(true);
                    setActive(-1);
                }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                required={required}
                autoFocus={autoFocus}
                autoComplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={isOpen && suggestions.length > 0}
                aria-controls={listId}
                aria-activedescendant={
                    isOpen && active >= 0 ? `${listId}-${active}` : undefined
                }
                aria-invalid={invalid || undefined}
                className={cn(inputClasses, className)}
            />
            <FloatingList
                open={isOpen && suggestions.length > 0}
                anchorRef={inputRef}
                onDismiss={close}
                id={listId}
            >
                {suggestions.map((option, index) => (
                    <FloatingOption
                        key={option}
                        id={`${listId}-${index}`}
                        active={index === active}
                        onChoose={() => choose(option)}
                        onHover={() => setActive(index)}
                    >
                        <span className="truncate">{option}</span>
                    </FloatingOption>
                ))}
            </FloatingList>
        </>
    );
}

import type { KeyboardEvent } from 'react';
import { useId, useState } from 'react';
import { PlusIcon, SearchIcon, UserIcon } from '@/components/icons';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Select } from '@/components/ui/select';

export type EmployeeOption = {
    id: number;
    name: string;
    division: string | null;
};

export type EmployeeChoice =
    | { kind: 'existing'; id: number }
    | { kind: 'new'; name: string; divisionId: string };

type EmployeePickerProps = {
    id: string;
    employees: EmployeeOption[];
    divisions: { id: number; name: string }[];
    value: EmployeeChoice | null;
    onChange: (value: EmployeeChoice | null) => void;
    error?: string;
    /**
     * When set, the choice is also written to hidden inputs so the picker
     * works inside a plain `<Form>`: the employee id goes to this field name,
     * a new employee to `new_employee_name` and `new_employee_division_id`.
     */
    idFieldName?: string;
};

/**
 * Search employees by name, or add a new one on the spot with only a name.
 * The division is optional and can be completed later in Master Data.
 */
export function EmployeePicker({
    id,
    employees,
    divisions,
    value,
    onChange,
    error,
    idFieldName,
}: EmployeePickerProps) {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [highlighted, setHighlighted] = useState(0);
    const listId = useId();

    const normalized = query.trim().toLowerCase();
    const matches = employees
        .filter(
            (employee) =>
                !normalized ||
                `${employee.name} ${employee.division ?? ''}`
                    .toLowerCase()
                    .includes(normalized),
        )
        .slice(0, 5);
    const totalMatches = employees.filter(
        (employee) =>
            !normalized ||
            `${employee.name} ${employee.division ?? ''}`
                .toLowerCase()
                .includes(normalized),
    ).length;
    const exactMatch = employees.some(
        (employee) => employee.name.toLowerCase() === normalized,
    );
    const canCreate = normalized !== '' && !exactMatch;
    const optionCount = matches.length + (canCreate ? 1 : 0);

    function chooseExisting(employee: EmployeeOption) {
        onChange({ kind: 'existing', id: employee.id });
        setQuery('');
        setIsOpen(false);
    }

    function chooseNew() {
        onChange({ kind: 'new', name: query.trim(), divisionId: '' });
        setQuery('');
        setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setIsOpen(true);
            setHighlighted((current) => Math.min(current + 1, optionCount - 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlighted((current) => Math.max(current - 1, 0));
        } else if (event.key === 'Enter') {
            event.preventDefault();

            if (highlighted < matches.length && matches[highlighted]) {
                chooseExisting(matches[highlighted]);
            } else if (canCreate) {
                chooseNew();
            }
        } else if (event.key === 'Escape') {
            setIsOpen(false);
        }
    }

    const selected =
        value?.kind === 'existing'
            ? employees.find((employee) => employee.id === value.id)
            : undefined;

    const hiddenInputs = idFieldName && (
        <>
            <input
                type="hidden"
                name={idFieldName}
                value={value?.kind === 'existing' ? value.id : ''}
            />
            <input
                type="hidden"
                name="new_employee_name"
                value={value?.kind === 'new' ? value.name : ''}
            />
            <input
                type="hidden"
                name="new_employee_division_id"
                value={value?.kind === 'new' ? value.divisionId : ''}
            />
        </>
    );

    if (selected) {
        return (
            <div className="flex flex-col gap-2">
                {hiddenInputs}
                <div className="flex items-center gap-3 rounded-xl border border-ink-200 bg-white px-3 py-2">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700">
                        {initials(selected.name)}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-semibold text-ink-900">
                            {selected.name}
                        </span>
                        <span className="text-xs text-ink-500">
                            {selected.division ?? 'Divisi belum diisi'}
                        </span>
                    </span>
                    <button
                        type="button"
                        onClick={() => onChange(null)}
                        className="rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-brand-700 hover:bg-brand-50"
                    >
                        Ganti
                    </button>
                </div>
                {error && <p className="text-sm text-[#c52c32]">{error}</p>}
            </div>
        );
    }

    if (value?.kind === 'new') {
        return (
            <div className="flex flex-col gap-2">
                {hiddenInputs}
                <div className="flex flex-col gap-3 rounded-xl border border-brand-200 bg-brand-50/50 p-3">
                    <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-700 text-white">
                            <PlusIcon className="size-4" />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                            <span className="flex items-center gap-2">
                                <span className="truncate text-sm font-semibold text-ink-900">
                                    {value.name}
                                </span>
                                <span className="rounded-md bg-brand-700 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                                    Baru
                                </span>
                            </span>
                            <span className="text-xs text-ink-500">
                                Ditambahkan sebagai karyawan saat disimpan
                            </span>
                        </span>
                        <button
                            type="button"
                            onClick={() => onChange(null)}
                            className="rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-brand-700 hover:bg-brand-100"
                        >
                            Batal
                        </button>
                    </div>
                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium text-ink-700">
                            Divisi{' '}
                            <span className="font-normal text-ink-400">
                                (opsional, bisa dilengkapi nanti)
                            </span>
                        </span>
                        <Select
                            id={`${id}-division`}
                            aria-label="Divisi"
                            value={value.divisionId}
                            onChange={(divisionId) =>
                                onChange({ ...value, divisionId })
                            }
                            options={[
                                { value: '', label: 'Tanpa divisi' },
                                ...divisions.map((division) => ({
                                    value: String(division.id),
                                    label: division.name,
                                })),
                            ]}
                        />
                    </label>
                </div>
                {error && <p className="text-sm text-[#c52c32]">{error}</p>}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {hiddenInputs}
            <div
                className={cn(
                    'flex h-11 items-center gap-2.5 rounded-xl border bg-white px-3.5 focus-within:border-brand-500 focus-within:ring-3 focus-within:ring-brand-100',
                    error ? 'border-low' : 'border-ink-200',
                )}
            >
                <SearchIcon className="size-4 text-ink-500" />
                <input
                    id={id}
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    autoComplete="off"
                    value={query}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setIsOpen(true);
                        setHighlighted(0);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => setIsOpen(false)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ketik nama karyawan…"
                    className="min-w-0 flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
                />
            </div>

            {isOpen && (
                <ul
                    id={listId}
                    role="listbox"
                    className="flex flex-col gap-0.5 rounded-2xl border border-ink-200 bg-white p-1.5"
                >
                    {optionCount === 0 && (
                        <li className="px-3 py-3 text-center text-sm text-ink-500">
                            Ketik nama untuk mencari atau menambah karyawan.
                        </li>
                    )}
                    {matches.map((employee, index) => (
                        <li
                            key={employee.id}
                            role="option"
                            aria-selected={index === highlighted}
                            onMouseDown={(event) => {
                                event.preventDefault();
                                chooseExisting(employee);
                            }}
                            onMouseEnter={() => setHighlighted(index)}
                            className={cn(
                                'flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-1.5',
                                index === highlighted && 'bg-brand-50',
                            )}
                        >
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500">
                                <UserIcon className="size-4" />
                            </span>
                            <span className="flex min-w-0 flex-col">
                                <span className="truncate text-sm font-medium text-ink-900">
                                    {employee.name}
                                </span>
                                <span className="text-xs text-ink-500">
                                    {employee.division ?? 'Divisi belum diisi'}
                                </span>
                            </span>
                        </li>
                    ))}
                    {totalMatches > matches.length && (
                        <li className="px-3 pt-1 pb-1.5 text-xs text-ink-400">
                            +{totalMatches - matches.length} karyawan lain,
                            ketik nama untuk menyaring
                        </li>
                    )}
                    {canCreate && (
                        <li
                            role="option"
                            aria-selected={highlighted === matches.length}
                            onMouseDown={(event) => {
                                event.preventDefault();
                                chooseNew();
                            }}
                            onMouseEnter={() => setHighlighted(matches.length)}
                            className={cn(
                                'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2',
                                matches.length > 0 &&
                                    'mt-1 border-t border-ink-100',
                                highlighted === matches.length && 'bg-brand-50',
                            )}
                        >
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-700 text-white">
                                <PlusIcon className="size-4" />
                            </span>
                            <span className="flex min-w-0 flex-col">
                                <span className="truncate text-sm font-semibold text-brand-700">
                                    Tambah karyawan baru “{query.trim()}”
                                </span>
                                <span className="text-xs text-ink-500">
                                    Cukup nama, divisi boleh menyusul
                                </span>
                            </span>
                        </li>
                    )}
                </ul>
            )}
            {error && <p className="text-sm text-[#c52c32]">{error}</p>}
        </div>
    );
}

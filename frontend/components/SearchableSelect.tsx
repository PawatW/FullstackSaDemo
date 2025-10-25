import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';

export interface SearchableOption {
  value: string;
  label: string;
  description?: string;
  keywords?: string[];
}

interface SearchableSelectProps {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  emptyMessage?: string;
  searchPlaceholder?: string;
  className?: string;
  onInspectOption?: (option: SearchableOption) => void;
  inspectLabel?: string;
}

export function SearchableSelect({
  name,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  required,
  emptyMessage,
  searchPlaceholder,
  className,
  onInspectOption,
  inspectLabel
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(() => options.find((option) => option.value === value), [options, value]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return options;
    }
    return options.filter((option) => {
      const haystack = [option.label, option.value, ...(option.keywords ?? [])]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [options, query]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [isOpen]);

  const displayLabel = selectedOption?.label ?? (value ? value : placeholder ?? 'เลือก');

  return (
    <div ref={containerRef} className={clsx('relative text-sm', className)}>
      {name ? <input type="hidden" name={name} value={value} required={required} /> : null}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) {
            return;
          }
          setIsOpen((prev) => !prev);
        }}
        className={clsx(
          'flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100',
          selectedOption ? 'text-slate-700' : 'text-slate-400'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">{displayLabel}</span>
        <svg
          className="ml-2 h-4 w-4 text-slate-400"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-2">
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder ?? 'ค้นหา...'}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-2" role="listbox">
            {filteredOptions.length === 0 ? (
              <li className="px-4 py-3 text-sm text-slate-500">{emptyMessage ?? 'ไม่พบข้อมูล'}</li>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <li key={option.value}>
                    <div className="flex items-stretch gap-2 px-2 py-1">
                      <button
                        type="button"
                        onClick={() => {
                          onChange(option.value);
                          setIsOpen(false);
                          setQuery('');
                        }}
                        className={clsx(
                          'flex-1 rounded-lg px-4 py-2 text-left text-sm transition',
                          'flex flex-col items-start gap-1',
                          isSelected ? 'bg-primary-50 text-primary-700' : 'text-slate-700 hover:bg-slate-50'
                        )}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <span className="font-medium">{option.label}</span>
                        {option.description && <span className="text-xs text-slate-500">{option.description}</span>}
                      </button>
                      {onInspectOption && option.value && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setIsOpen(false);
                            setQuery('');
                            onInspectOption(option);
                          }}
                          className="whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                        >
                          {inspectLabel ?? 'รายละเอียด'}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default SearchableSelect;

"use client";

import { Fragment } from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";

export interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps {
  label?: string;
  value: SelectOption | null;
  onChange: (value: SelectOption) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function Select({
  label,
  value,
  onChange,
  options,
  placeholder = "Seleccionar...",
  error,
  disabled = false,
  required = false,
}: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="label">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}
      <Listbox value={value ?? undefined} onChange={onChange} disabled={disabled}>
        <div className="relative">
          <ListboxButton
            className={`input flex items-center justify-between ${
              error ? "input-error" : ""
            } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
          >
            <span className={value ? "text-foreground" : "text-muted"}>
              {value?.label || placeholder}
            </span>
            <ChevronUpDownIcon
              className="h-5 w-5 text-muted"
              aria-hidden="true"
            />
          </ListboxButton>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-surface py-1 shadow-lg ring-1 ring-border focus:outline-none">
              {options.map((option) => (
                <ListboxOption
                  key={option.value}
                  value={option}
                  className={({ active }) =>
                    `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                      active ? "bg-primary-light text-primary" : "text-foreground"
                    }`
                  }
                >
                  {({ selected }) => (
                    <>
                      <span
                        className={`block truncate ${
                          selected ? "font-medium" : "font-normal"
                        }`}
                      >
                        {option.label}
                      </span>
                      {selected && (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      )}
                    </>
                  )}
                </ListboxOption>
              ))}
            </ListboxOptions>
          </Transition>
        </div>
      </Listbox>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

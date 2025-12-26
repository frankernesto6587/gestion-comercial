"use client";

import { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  emptyMessage?: string;
  loading?: boolean;
  onRowClick?: (item: T) => void;
}

export default function Table<T extends object>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No hay datos disponibles",
  loading = false,
  onRowClick,
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="table-container">
        <div className="flex items-center justify-center py-12">
          <svg
            className="h-8 w-8 animate-spin text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="table-container">
        <div className="flex items-center justify-center py-12 text-muted">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)} className={column.className}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-surface">
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick?.(item)}
              className={onRowClick ? "cursor-pointer" : ""}
            >
              {columns.map((column) => (
                <td key={String(column.key)} className={column.className}>
                  {column.render
                    ? column.render(item)
                    : String((item as Record<string, unknown>)[column.key] ?? "-")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

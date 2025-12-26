"use client";

import { InformationCircleIcon } from "@heroicons/react/24/outline";

export interface TooltipFormulaProps {
  valor: string | number;
  formula: string;
  descripcion?: string;
  className?: string;
}

export default function TooltipFormula({
  valor,
  formula,
  descripcion,
  className = ""
}: TooltipFormulaProps) {
  return (
    <div className={`group relative inline-flex items-center gap-1 ${className}`}>
      <span>{valor}</span>
      <InformationCircleIcon className="h-3.5 w-3.5 text-muted opacity-50 group-hover:opacity-100 transition-opacity cursor-help" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
        <div className="bg-foreground text-background text-xs rounded-lg px-3 py-2 shadow-lg min-w-[200px] max-w-[300px]">
          {descripcion && <div className="font-medium mb-1">{descripcion}</div>}
          <div className="font-mono text-[10px] opacity-80 whitespace-pre-wrap">{formula}</div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
            <div className="border-8 border-transparent border-t-foreground"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

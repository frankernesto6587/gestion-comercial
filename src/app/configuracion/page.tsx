"use client";

import Link from "next/link";
import {
  CurrencyDollarIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";

const configOptions = [
  {
    title: "Importadoras",
    description: "Gestiona las empresas importadoras",
    href: "/configuracion/importadoras",
    icon: BuildingOfficeIcon,
  },
  {
    title: "Proveedores",
    description: "Gestiona los proveedores de productos",
    href: "/configuracion/proveedores",
    icon: TruckIcon,
  },
  {
    title: "Monedas",
    description: "Gestiona las monedas y tasas de cambio por defecto",
    href: "/configuracion/monedas",
    icon: CurrencyDollarIcon,
  },
  {
    title: "Tipos de Gasto",
    description: "Configura los tipos de gasto para importaciones",
    href: "/configuracion/tipos-gasto",
    icon: DocumentTextIcon,
  },
];

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
        <p className="text-sm text-muted">
          Administra la configuración del sistema
        </p>
      </div>

      {/* Options Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {configOptions.map((option) => (
          <Link
            key={option.href}
            href={option.href}
            className="card hover:border-primary/50 transition-colors group"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
                <option.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {option.title}
                </h2>
                <p className="text-sm text-muted mt-1">{option.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

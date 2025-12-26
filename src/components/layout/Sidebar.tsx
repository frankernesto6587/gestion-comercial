"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  CubeIcon,
  TruckIcon,
  ArchiveBoxIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  BanknotesIcon,
  CreditCardIcon,
  SunIcon,
  MoonIcon,
} from "@heroicons/react/24/outline";
import { useThemeStore } from "@/stores/themeStore";

const navigation = [
  { name: "Dashboard", href: "/", icon: HomeIcon },
  { name: "Productos", href: "/productos", icon: CubeIcon },
  { name: "Importaciones", href: "/importaciones", icon: TruckIcon },
  { name: "Estado de Cuenta", href: "/estado-cuenta", icon: CreditCardIcon },
  { name: "Ventas", href: "/ventas", icon: BanknotesIcon },
  { name: "Inventario", href: "/inventario", icon: ArchiveBoxIcon },
  { name: "Reportes", href: "/reportes", icon: ChartBarIcon },
  { name: "Configuración", href: "/configuracion", icon: Cog6ToothIcon },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Determinar si está en modo oscuro (considerando "system")
  const isDark = mounted && (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches));

  return (
    <div className="flex h-full w-64 flex-col bg-surface border-r border-border">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-border">
        <h1 className="text-xl font-bold text-primary">Gestión Comercial</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={classNames(
                isActive
                  ? "bg-primary-light text-primary"
                  : "text-secondary hover:bg-surface-hover hover:text-foreground",
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
              )}
            >
              <item.icon
                className={classNames(
                  isActive ? "text-primary" : "text-muted group-hover:text-foreground",
                  "h-5 w-5 flex-shrink-0 transition-colors"
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Theme Toggle */}
      <div className="px-3 pb-2">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-secondary hover:bg-surface-hover hover:text-foreground transition-colors"
        >
          {mounted && isDark ? (
            <>
              <SunIcon className="h-5 w-5 text-muted" />
              Modo Claro
            </>
          ) : (
            <>
              <MoonIcon className="h-5 w-5 text-muted" />
              Modo Oscuro
            </>
          )}
        </button>
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <p className="text-xs text-muted text-center">
          v1.0.0 • Gestión Comercial
        </p>
      </div>
    </div>
  );
}

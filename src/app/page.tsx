"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CubeIcon,
  TruckIcon,
  ArchiveBoxIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";

interface Stats {
  productos: {
    total: number;
    activos: number;
  };
  importaciones: {
    total: number;
    ultimoMes: number;
    invertidoMes: number;
    unidadesMes: number;
  };
  inventario: {
    totalUnidades: number;
    productosConInventario: number;
    stockBajo: number;
  };
}

interface ImportacionReciente {
  id: number;
  fecha: string;
  importadora: string;
  numeroContenedor: string | null;
  totalUSD: number;
  totalUnidades: number;
  cantidadProductos: number;
}

interface AlertaStock {
  id: number;
  producto: string;
  actual: number;
  minimo: number;
}

interface DashboardData {
  stats: Stats;
  ultimasImportaciones: ImportacionReciente[];
  alertasStock: AlertaStock[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/dashboard");
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted">
        Error al cargar el dashboard
      </div>
    );
  }

  const { stats, ultimasImportaciones, alertasStock } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted">
          Resumen de tu gestión comercial
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Productos */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Productos</p>
              <p className="text-2xl font-bold">{stats.productos.activos}</p>
              <p className="text-xs text-muted">
                de {stats.productos.total} total
              </p>
            </div>
            <div className="p-3 rounded-lg bg-primary-light">
              <CubeIcon className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        {/* Importaciones del mes */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Importaciones (30 días)</p>
              <p className="text-2xl font-bold">{stats.importaciones.ultimoMes}</p>
              <p className="text-xs text-muted">
                de {stats.importaciones.total} total
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <TruckIcon className="h-6 w-6 text-info" />
            </div>
          </div>
        </div>

        {/* Inversión del mes */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Invertido (30 días)</p>
              <p className="text-2xl font-bold">
                {formatCurrency(stats.importaciones.invertidoMes)}
              </p>
              <p className="text-xs text-muted">
                {stats.importaciones.unidadesMes.toLocaleString()} unidades
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CurrencyDollarIcon className="h-6 w-6 text-success" />
            </div>
          </div>
        </div>

        {/* Inventario */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Stock Total</p>
              <p className="text-2xl font-bold">
                {stats.inventario.totalUnidades.toLocaleString()}
              </p>
              <p className="text-xs text-muted">unidades en inventario</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <ArchiveBoxIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Últimas importaciones */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Últimas Importaciones</h2>
            <Link
              href="/importaciones"
              className="text-sm text-primary hover:underline"
            >
              Ver todas
            </Link>
          </div>

          {ultimasImportaciones.length === 0 ? (
            <p className="text-center py-8 text-muted">
              No hay importaciones registradas
            </p>
          ) : (
            <div className="space-y-3">
              {ultimasImportaciones.map((imp) => (
                <Link
                  key={imp.id}
                  href={`/importaciones/${imp.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-surface-hover transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary-light">
                      <TruckIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{imp.importadora}</p>
                      <p className="text-xs text-muted">
                        {formatDate(imp.fecha)} • {imp.cantidadProductos}{" "}
                        productos
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-success">
                      {formatCurrency(imp.totalUSD)}
                    </p>
                    <p className="text-xs text-muted">
                      {imp.totalUnidades.toLocaleString()} unid.
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Alertas de stock */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Alertas de Stock</h2>
            {alertasStock.length > 0 && (
              <span className="badge badge-warning">
                {alertasStock.length}
              </span>
            )}
          </div>

          {alertasStock.length === 0 ? (
            <div className="text-center py-8">
              <ArrowTrendingUpIcon className="h-8 w-8 mx-auto text-success mb-2" />
              <p className="text-muted">Stock en niveles óptimos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alertasStock.slice(0, 5).map((alerta) => (
                <div
                  key={alerta.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30"
                >
                  <ExclamationTriangleIcon className="h-5 w-5 text-warning flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{alerta.producto}</p>
                    <p className="text-xs text-muted">
                      Stock: {alerta.actual} / Mínimo: {alerta.minimo}
                    </p>
                  </div>
                </div>
              ))}
              {alertasStock.length > 5 && (
                <Link
                  href="/inventario?stockBajo=true"
                  className="block text-center text-sm text-primary hover:underline"
                >
                  Ver {alertasStock.length - 5} más
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/importaciones/nueva"
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:bg-surface-hover transition-colors"
          >
            <TruckIcon className="h-8 w-8 text-primary" />
            <span className="text-sm font-medium">Nueva Importación</span>
          </Link>
          <Link
            href="/productos"
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:bg-surface-hover transition-colors"
          >
            <CubeIcon className="h-8 w-8 text-info" />
            <span className="text-sm font-medium">Gestionar Productos</span>
          </Link>
          <Link
            href="/inventario"
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:bg-surface-hover transition-colors"
          >
            <ArchiveBoxIcon className="h-8 w-8 text-purple-600" />
            <span className="text-sm font-medium">Ver Inventario</span>
          </Link>
          <Link
            href="/reportes"
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:bg-surface-hover transition-colors"
          >
            <ArrowTrendingUpIcon className="h-8 w-8 text-success" />
            <span className="text-sm font-medium">Generar Reportes</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Button, Modal } from "@/components/ui";
import { useAlert } from "@/contexts/AlertContext";

interface LineaVenta {
  id: number;
  fecha: string;
  productoId: number;
  canal: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  producto: {
    nombre: string;
  };
}

interface TransferenciaVenta {
  id: number;
  fecha: string;
  monto: number;
}

interface TotalesPorProducto {
  nombre: string;
  usd: { cantidad: number; subtotal: number };
  fiscal: { cantidad: number; subtotal: number };
  efectivo: { cantidad: number; subtotal: number };
  total: { cantidad: number; subtotal: number };
}

interface Venta {
  id: number;
  fechaInicio: string;
  fechaFin: string;
  totalTransferencias: number;
  totalUnidades: number;
  totalCUP: number;
  modoDistribucion: string;
  observaciones: string | null;
  createdAt: string;
  transferencias: TransferenciaVenta[];
  lineas: LineaVenta[];
  totalesPorProducto: Record<number, TotalesPorProducto>;
  totalesGenerales: {
    usd: { cantidad: number; subtotal: number };
    fiscal: { cantidad: number; subtotal: number };
    efectivo: { cantidad: number; subtotal: number };
    total: { cantidad: number; subtotal: number };
  };
}

export default function VentaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { showAlert } = useAlert();
  const [venta, setVenta] = useState<Venta | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchVenta = async () => {
      try {
        const response = await fetch(`/api/ventas/${id}`);
        if (response.ok) {
          const data = await response.json();
          setVenta(data);
        } else {
          router.push("/ventas");
        }
      } catch (error) {
        console.error("Error al cargar venta:", error);
        router.push("/ventas");
      } finally {
        setLoading(false);
      }
    };
    fetchVenta();
  }, [id, router]);

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/ventas/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/ventas");
      } else {
        const data = await response.json();
        showAlert({
          type: "error",
          title: "Error",
          message: data.error || "Error al eliminar venta",
        });
      }
    } catch (error) {
      console.error("Error al eliminar:", error);
      showAlert({
        type: "error",
        title: "Error de conexión",
        message: "Error al eliminar venta",
      });
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await fetch(`/api/ventas/${id}/excel`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `venta-${id}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        showAlert({
          type: "error",
          title: "Error",
          message: "Error al exportar Excel",
        });
      }
    } catch (error) {
      console.error("Error al exportar:", error);
      showAlert({
        type: "error",
        title: "Error de conexión",
        message: "Error al exportar Excel",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CU", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!venta) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/ventas"
            className="p-2 hover:bg-muted/20 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-muted" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Venta #{venta.id}
            </h1>
            <p className="text-sm text-muted">
              Período: {formatDate(venta.fechaInicio)} -{" "}
              {formatDate(venta.fechaFin)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExportExcel}>
            <ArrowDownTrayIcon className="h-4 w-4" />
            Exportar Excel
          </Button>
          <Button variant="danger" onClick={() => setDeleteConfirm(true)}>
            <TrashIcon className="h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </div>

      {/* Resumen */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Resumen</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-muted/10 rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(Number(venta.totalTransferencias))}
            </div>
            <div className="text-sm text-muted">Transferencias CUP</div>
          </div>
          <div className="text-center p-4 bg-muted/10 rounded-lg">
            <div className="text-2xl font-bold text-foreground">
              {venta.totalUnidades.toLocaleString()}
            </div>
            <div className="text-sm text-muted">Unidades Vendidas</div>
          </div>
          <div className="text-center p-4 bg-muted/10 rounded-lg">
            <div className="text-2xl font-bold text-success">
              {formatCurrency(Number(venta.totalCUP))}
            </div>
            <div className="text-sm text-muted">Total Ventas CUP</div>
          </div>
          <div className="text-center p-4 bg-muted/10 rounded-lg">
            <div className="text-2xl font-bold text-foreground">
              {venta.lineas.length}
            </div>
            <div className="text-sm text-muted">Líneas de Venta</div>
          </div>
        </div>

        {venta.observaciones && (
          <div className="mt-4 p-3 bg-muted/10 rounded-lg">
            <span className="text-sm text-muted">Observaciones: </span>
            <span>{venta.observaciones}</span>
          </div>
        )}
      </div>

      {/* Transferencias */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Transferencias Bancarias</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {venta.transferencias.map((t) => (
            <div
              key={t.id}
              className="p-3 bg-muted/10 rounded-lg text-center"
            >
              <div className="text-sm text-muted">{formatDate(t.fecha)}</div>
              <div className="font-semibold">
                {formatCurrency(Number(t.monto))} CUP
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totales por producto */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Totales por Producto</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3">Producto</th>
                <th className="text-right py-3">
                  <span className="badge badge-primary">USD</span>
                </th>
                <th className="text-right py-3">
                  <span className="badge badge-success">Fiscal</span>
                </th>
                <th className="text-right py-3">
                  <span className="badge badge-warning">Efectivo</span>
                </th>
                <th className="text-right py-3 font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(venta.totalesPorProducto).map(([id, prod]) => (
                <tr key={id} className="border-b border-border/50">
                  <td className="py-3 font-medium">{prod.nombre}</td>
                  <td className="text-right py-3">
                    <div>{prod.usd.cantidad.toLocaleString()} uds</div>
                    <div className="text-xs text-muted">
                      {formatCurrency(prod.usd.subtotal)} CUP
                    </div>
                  </td>
                  <td className="text-right py-3">
                    <div>{prod.fiscal.cantidad.toLocaleString()} uds</div>
                    <div className="text-xs text-muted">
                      {formatCurrency(prod.fiscal.subtotal)} CUP
                    </div>
                  </td>
                  <td className="text-right py-3">
                    <div>{prod.efectivo.cantidad.toLocaleString()} uds</div>
                    <div className="text-xs text-muted">
                      {formatCurrency(prod.efectivo.subtotal)} CUP
                    </div>
                  </td>
                  <td className="text-right py-3 font-bold">
                    <div>{prod.total.cantidad.toLocaleString()} uds</div>
                    <div className="text-xs text-success">
                      {formatCurrency(prod.total.subtotal)} CUP
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="font-bold bg-muted/10">
                <td className="py-3">TOTAL GENERAL</td>
                <td className="text-right py-3">
                  <div>
                    {venta.totalesGenerales.usd.cantidad.toLocaleString()} uds
                  </div>
                  <div className="text-xs">
                    {formatCurrency(venta.totalesGenerales.usd.subtotal)} CUP
                  </div>
                </td>
                <td className="text-right py-3">
                  <div>
                    {venta.totalesGenerales.fiscal.cantidad.toLocaleString()} uds
                  </div>
                  <div className="text-xs">
                    {formatCurrency(venta.totalesGenerales.fiscal.subtotal)} CUP
                  </div>
                </td>
                <td className="text-right py-3">
                  <div>
                    {venta.totalesGenerales.efectivo.cantidad.toLocaleString()}{" "}
                    uds
                  </div>
                  <div className="text-xs">
                    {formatCurrency(venta.totalesGenerales.efectivo.subtotal)}{" "}
                    CUP
                  </div>
                </td>
                <td className="text-right py-3 text-success">
                  <div>
                    {venta.totalesGenerales.total.cantidad.toLocaleString()} uds
                  </div>
                  <div className="text-xs">
                    {formatCurrency(venta.totalesGenerales.total.subtotal)} CUP
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Detalle de líneas */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Detalle de Ventas por Día</h2>
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2">Fecha</th>
                <th className="text-left py-2 px-2">Producto</th>
                <th className="text-left py-2 px-2">Canal</th>
                <th className="text-right py-2 px-2">Cantidad</th>
                <th className="text-right py-2 px-2">Precio</th>
                <th className="text-right py-2 px-2">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {venta.lineas.map((linea) => (
                <tr key={linea.id} className="border-b border-border/50">
                  <td className="py-2 px-2">{formatDate(linea.fecha)}</td>
                  <td className="py-2 px-2">{linea.producto.nombre}</td>
                  <td className="py-2 px-2">
                    <span
                      className={`badge ${
                        linea.canal === "USD"
                          ? "badge-primary"
                          : linea.canal === "FISCAL"
                          ? "badge-success"
                          : "badge-warning"
                      }`}
                    >
                      {linea.canal}
                    </span>
                  </td>
                  <td className="text-right py-2 px-2">
                    {linea.cantidad.toLocaleString()}
                  </td>
                  <td className="text-right py-2 px-2">
                    {formatCurrency(Number(linea.precioUnitario))}
                  </td>
                  <td className="text-right py-2 px-2 font-medium">
                    {formatCurrency(Number(linea.subtotal))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      <Modal
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        title="Confirmar Eliminación"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-foreground">
            ¿Estás seguro de que deseas eliminar esta venta?
          </p>
          <p className="text-sm text-muted">
            Esto revertirá el inventario de los productos vendidos. Esta acción
            no se puede deshacer.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

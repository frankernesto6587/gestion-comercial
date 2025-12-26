"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  PlusIcon,
  EyeIcon,
  TrashIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { Button, Input, Modal, Table } from "@/components/ui";
import { useAlert } from "@/contexts/AlertContext";

interface TransferenciaVenta {
  id: number;
  fecha: string;
  monto: number;
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
  _count: {
    lineas: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function VentasPage() {
  const { showAlert } = useAlert();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    fechaDesde: "",
    fechaHasta: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState<Venta | null>(null);

  const fetchVentas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filtros.fechaDesde && { fechaDesde: filtros.fechaDesde }),
        ...(filtros.fechaHasta && { fechaHasta: filtros.fechaHasta }),
      });

      const response = await fetch(`/api/ventas?${params}`);
      const data = await response.json();

      setVentas(data.data || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error al cargar ventas:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filtros]);

  useEffect(() => {
    fetchVentas();
  }, [fetchVentas]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchVentas();
  };

  const handleDelete = async (venta: Venta) => {
    try {
      const response = await fetch(`/api/ventas/${venta.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDeleteConfirm(null);
        fetchVentas();
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

  const handleExportExcel = async (ventaId: number) => {
    try {
      const response = await fetch(`/api/ventas/${ventaId}/excel`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `venta-${ventaId}.xlsx`;
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

  const formatCurrency = (value: number, currency: string = "CUP") => {
    return new Intl.NumberFormat("es-CU", {
      style: "currency",
      currency: currency === "CUP" ? "CUP" : "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const columns = [
    {
      key: "periodo",
      header: "Período",
      render: (item: Venta) => (
        <span>
          {formatDate(item.fechaInicio)} - {formatDate(item.fechaFin)}
        </span>
      ),
    },
    {
      key: "transferencias",
      header: "Transferencias",
      render: (item: Venta) => (
        <div>
          <span className="font-medium">
            {formatCurrency(Number(item.totalTransferencias))}
          </span>
          <span className="text-xs text-muted ml-1">
            ({item.transferencias.length} días)
          </span>
        </div>
      ),
    },
    {
      key: "totalUnidades",
      header: "Unidades",
      render: (item: Venta) => item.totalUnidades.toLocaleString(),
    },
    {
      key: "totalCUP",
      header: "Total CUP",
      render: (item: Venta) => (
        <span className="font-medium text-success">
          {formatCurrency(Number(item.totalCUP))}
        </span>
      ),
    },
    {
      key: "modo",
      header: "Modo",
      render: (item: Venta) => (
        <span
          className={`badge ${
            item.modoDistribucion === "AUTO" ? "badge-info" : "badge-secondary"
          }`}
        >
          {item.modoDistribucion}
        </span>
      ),
    },
    {
      key: "lineas",
      header: "Líneas",
      render: (item: Venta) => (
        <span className="badge badge-primary">{item._count.lineas}</span>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (item: Venta) => (
        <div className="flex gap-2">
          <Link
            href={`/ventas/${item.id}`}
            className="p-1 text-muted hover:text-primary transition-colors"
            title="Ver detalle"
          >
            <EyeIcon className="h-4 w-4" />
          </Link>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleExportExcel(item.id);
            }}
            className="p-1 text-muted hover:text-success transition-colors"
            title="Exportar Excel"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteConfirm(item);
            }}
            className="p-1 text-muted hover:text-error transition-colors"
            title="Eliminar"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ventas</h1>
          <p className="text-sm text-muted">
            Gestiona las ventas generadas por período
          </p>
        </div>
        <Link href="/ventas/nueva">
          <Button>
            <PlusIcon className="h-4 w-4" />
            Nueva Venta
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="card">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          <div className="w-40">
            <Input
              type="date"
              value={filtros.fechaDesde}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, fechaDesde: e.target.value }))
              }
              placeholder="Desde"
            />
          </div>
          <div className="w-40">
            <Input
              type="date"
              value={filtros.fechaHasta}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, fechaHasta: e.target.value }))
              }
              placeholder="Hasta"
            />
          </div>
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </form>
      </div>

      {/* Tabla */}
      <Table
        columns={columns}
        data={ventas}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="No hay ventas registradas"
      />

      {/* Paginación */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">
            Mostrando {(pagination.page - 1) * pagination.limit + 1} -{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} de{" "}
            {pagination.total} ventas
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmar Eliminación"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-foreground">
            ¿Estás seguro de que deseas eliminar la venta del período{" "}
            <strong>
              {deleteConfirm && formatDate(deleteConfirm.fechaInicio)} -{" "}
              {deleteConfirm && formatDate(deleteConfirm.fechaFin)}
            </strong>
            ?
          </p>
          <p className="text-sm text-muted">
            Esto revertirá el inventario de los productos vendidos. Esta acción
            no se puede deshacer.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

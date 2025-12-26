"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PlusIcon, EyeIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Button, Input, Modal, Table } from "@/components/ui";
import { useAlert } from "@/contexts/AlertContext";

interface ProductoImportado {
  id: number;
  producto: {
    nombre: string;
    descripcion: string | null;
  };
  cantidadUnidades: number;
  importeUSD: number;
}

interface Importacion {
  id: number;
  fecha: string;
  numeroContenedor: string | null;
  importadora: {
    id: number;
    nombre: string;
  };
  proveedor: {
    id: number;
    nombre: string;
  };
  productos: ProductoImportado[];
  totalUSD: number;
  totalUnidades: number;
  cantidadProductos: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ImportacionesPage() {
  const { showAlert } = useAlert();
  const [importaciones, setImportaciones] = useState<Importacion[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    importadora: "",
    fechaDesde: "",
    fechaHasta: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState<Importacion | null>(null);

  const fetchImportaciones = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filtros.importadora && { importadora: filtros.importadora }),
        ...(filtros.fechaDesde && { fechaDesde: filtros.fechaDesde }),
        ...(filtros.fechaHasta && { fechaHasta: filtros.fechaHasta }),
      });

      const response = await fetch(`/api/importaciones?${params}`);
      const data = await response.json();

      setImportaciones(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error al cargar importaciones:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filtros]);

  useEffect(() => {
    fetchImportaciones();
  }, [fetchImportaciones]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchImportaciones();
  };

  const handleDelete = async (importacion: Importacion) => {
    try {
      const response = await fetch(`/api/importaciones/${importacion.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDeleteConfirm(null);
        fetchImportaciones();
      } else {
        const data = await response.json();
        showAlert({
          type: "error",
          title: "Error",
          message: data.error || "Error al eliminar importación",
        });
      }
    } catch (error) {
      console.error("Error al eliminar:", error);
      showAlert({
        type: "error",
        title: "Error de conexión",
        message: "Error al eliminar importación",
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
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const columns = [
    {
      key: "fecha",
      header: "Fecha",
      render: (item: Importacion) => formatDate(item.fecha),
    },
    {
      key: "numeroContenedor",
      header: "Contenedor",
      render: (item: Importacion) => item.numeroContenedor || "-",
    },
    {
      key: "importadora",
      header: "Importadora",
      render: (item: Importacion) => item.importadora?.nombre || "-",
    },
    {
      key: "proveedor",
      header: "Proveedor",
      render: (item: Importacion) => item.proveedor?.nombre || "-",
    },
    {
      key: "productos",
      header: "Productos",
      render: (item: Importacion) => (
        <span className="badge badge-info">{item.cantidadProductos}</span>
      ),
    },
    {
      key: "totalUnidades",
      header: "Unidades",
      render: (item: Importacion) => item.totalUnidades.toLocaleString(),
    },
    {
      key: "totalUSD",
      header: "Total USD",
      render: (item: Importacion) => (
        <span className="font-medium">{formatCurrency(item.totalUSD)}</span>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (item: Importacion) => (
        <div className="flex gap-2">
          <Link
            href={`/importaciones/${item.id}`}
            className="p-1 text-muted hover:text-primary transition-colors"
            title="Ver detalle"
          >
            <EyeIcon className="h-4 w-4" />
          </Link>
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
          <h1 className="text-2xl font-bold text-foreground">Importaciones</h1>
          <p className="text-sm text-muted">
            Gestiona los contenedores y productos importados
          </p>
        </div>
        <Link href="/importaciones/nueva">
          <Button>
            <PlusIcon className="h-4 w-4" />
            Nueva Importación
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="card">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Buscar por importadora..."
              value={filtros.importadora}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, importadora: e.target.value }))
              }
            />
          </div>
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
        data={importaciones}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="No hay importaciones registradas"
      />

      {/* Paginación */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">
            Mostrando {(pagination.page - 1) * pagination.limit + 1} -{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} de{" "}
            {pagination.total} importaciones
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
            ¿Estás seguro de que deseas eliminar la importación del{" "}
            <strong>{deleteConfirm && formatDate(deleteConfirm.fecha)}</strong>?
          </p>
          <p className="text-sm text-muted">
            Esto revertirá el inventario de los productos asociados. Esta acción
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

"use client";

import { useState, useEffect, useCallback } from "react";
import { PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Button, Input, Modal, Table } from "@/components/ui";
import ProductoForm from "./ProductoForm";
import { useAlert } from "@/contexts/AlertContext";

interface Producto {
  id: number;
  codefref: number | null;
  nombre: string;
  descripcion: string | null;
  unidadMedida: string;
  pack: number;
  activo: boolean;
  inventario?: {
    cantidadActual: number;
    cantidadMinima: number;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ProductosPage() {
  const { showAlert } = useAlert();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [productoEditar, setProductoEditar] = useState<Producto | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Producto | null>(null);

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        busqueda,
      });

      const response = await fetch(`/api/productos?${params}`);
      const data = await response.json();

      setProductos(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error al cargar productos:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, busqueda]);

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchProductos();
  };

  const handleDelete = async (producto: Producto) => {
    try {
      const response = await fetch(`/api/productos/${producto.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDeleteConfirm(null);
        fetchProductos();
      } else {
        const data = await response.json();
        showAlert({
          type: "error",
          title: "Error",
          message: data.error || "Error al eliminar producto",
        });
      }
    } catch (error) {
      console.error("Error al eliminar:", error);
      showAlert({
        type: "error",
        title: "Error de conexión",
        message: "Error al eliminar producto",
      });
    }
  };

  const handleFormSuccess = () => {
    setModalOpen(false);
    setProductoEditar(null);
    fetchProductos();
  };

  const columns = [
    {
      key: "codefref",
      header: "Código Ref.",
      render: (item: Producto) => (
        <span className="font-mono text-sm">
          {item.codefref ?? "-"}
        </span>
      ),
    },
    {
      key: "nombre",
      header: "Nombre",
      render: (item: Producto) => (
        <div>
          <p className="font-medium">{item.nombre}</p>
          {item.descripcion && (
            <p className="text-xs text-muted">{item.descripcion}</p>
          )}
        </div>
      ),
    },
    {
      key: "unidadMedida",
      header: "Unidad",
    },
    {
      key: "pack",
      header: "Pack",
      render: (item: Producto) => (
        <span className="font-mono text-sm">{item.pack}</span>
      ),
    },
    {
      key: "stock",
      header: "Stock",
      render: (item: Producto) => {
        const stock = item.inventario?.cantidadActual ?? 0;
        const minimo = item.inventario?.cantidadMinima ?? 0;
        const isLow = stock <= minimo && minimo > 0;

        return (
          <span className={isLow ? "text-error font-medium" : ""}>
            {stock}
          </span>
        );
      },
    },
    {
      key: "activo",
      header: "Estado",
      render: (item: Producto) => (
        <span className={item.activo ? "badge badge-success" : "badge badge-error"}>
          {item.activo ? "Activo" : "Inactivo"}
        </span>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (item: Producto) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setProductoEditar(item);
              setModalOpen(true);
            }}
            className="p-1 text-muted hover:text-primary transition-colors"
            title="Editar"
          >
            <PencilIcon className="h-4 w-4" />
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
          <h1 className="text-2xl font-bold text-foreground">Productos</h1>
          <p className="text-sm text-muted">
            Gestiona el catálogo de productos
          </p>
        </div>
        <Button
          onClick={() => {
            setProductoEditar(null);
            setModalOpen(true);
          }}
        >
          <PlusIcon className="h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

      {/* Search */}
      <div className="card">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nombre o descripción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </form>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={productos}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="No hay productos registrados"
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">
            Mostrando {(pagination.page - 1) * pagination.limit + 1} -{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} de{" "}
            {pagination.total} productos
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setProductoEditar(null);
        }}
        title={productoEditar ? "Editar Producto" : "Nuevo Producto"}
      >
        <ProductoForm
          producto={productoEditar}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setModalOpen(false);
            setProductoEditar(null);
          }}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmar Eliminación"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-foreground">
            ¿Estás seguro de que deseas eliminar el producto{" "}
            <strong>{deleteConfirm?.nombre}</strong>?
          </p>
          <p className="text-sm text-muted">Esta acción no se puede deshacer.</p>
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

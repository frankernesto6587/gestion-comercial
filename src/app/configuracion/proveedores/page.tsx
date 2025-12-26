"use client";

import { useState, useEffect, useCallback } from "react";
import { PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Button, Modal, Table } from "@/components/ui";
import ProveedorForm from "./ProveedorForm";
import Link from "next/link";
import { useAlert } from "@/contexts/AlertContext";

interface Proveedor {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export default function ProveedoresPage() {
  const { showAlert } = useAlert();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [proveedorEditar, setProveedorEditar] = useState<Proveedor | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Proveedor | null>(null);

  const fetchProveedores = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/proveedores");
      const data = await response.json();
      setProveedores(data);
    } catch (error) {
      console.error("Error al cargar proveedores:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProveedores();
  }, [fetchProveedores]);

  const handleDelete = async (proveedor: Proveedor) => {
    try {
      const response = await fetch(`/api/proveedores/${proveedor.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDeleteConfirm(null);
        fetchProveedores();
      } else {
        const data = await response.json();
        showAlert({
          type: "error",
          title: "Error",
          message: data.error || "Error al eliminar proveedor",
        });
      }
    } catch (error) {
      console.error("Error al eliminar:", error);
      showAlert({
        type: "error",
        title: "Error de conexión",
        message: "Error al eliminar proveedor",
      });
    }
  };

  const handleFormSuccess = () => {
    setModalOpen(false);
    setProveedorEditar(null);
    fetchProveedores();
  };

  const columns = [
    {
      key: "nombre",
      header: "Nombre",
      render: (item: Proveedor) => (
        <span className="font-medium">{item.nombre}</span>
      ),
    },
    {
      key: "descripcion",
      header: "Descripción",
      render: (item: Proveedor) => (
        <span className="text-muted">{item.descripcion || "-"}</span>
      ),
    },
    {
      key: "activo",
      header: "Estado",
      render: (item: Proveedor) => (
        <span className={item.activo ? "badge badge-success" : "badge badge-error"}>
          {item.activo ? "Activo" : "Inactivo"}
        </span>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (item: Proveedor) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setProveedorEditar(item);
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
      {/* Breadcrumb */}
      <nav className="text-sm text-muted">
        <Link href="/configuracion" className="hover:text-primary">
          Configuración
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Proveedores</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Proveedores</h1>
          <p className="text-sm text-muted">
            Gestiona los proveedores de productos
          </p>
        </div>
        <Button
          onClick={() => {
            setProveedorEditar(null);
            setModalOpen(true);
          }}
        >
          <PlusIcon className="h-4 w-4" />
          Nuevo Proveedor
        </Button>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={proveedores}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="No hay proveedores registrados"
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setProveedorEditar(null);
        }}
        title={proveedorEditar ? "Editar Proveedor" : "Nuevo Proveedor"}
      >
        <ProveedorForm
          proveedor={proveedorEditar}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setModalOpen(false);
            setProveedorEditar(null);
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
            ¿Estás seguro de que deseas eliminar el proveedor{" "}
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

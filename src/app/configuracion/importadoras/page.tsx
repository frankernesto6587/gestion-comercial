"use client";

import { useState, useEffect, useCallback } from "react";
import { PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Button, Modal, Table } from "@/components/ui";
import ImportadoraForm from "./ImportadoraForm";
import Link from "next/link";
import { useAlert } from "@/contexts/AlertContext";

interface Importadora {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export default function ImportadorasPage() {
  const { showAlert } = useAlert();
  const [importadoras, setImportadoras] = useState<Importadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [importadoraEditar, setImportadoraEditar] = useState<Importadora | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Importadora | null>(null);

  const fetchImportadoras = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/importadoras");
      const data = await response.json();
      setImportadoras(data);
    } catch (error) {
      console.error("Error al cargar importadoras:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImportadoras();
  }, [fetchImportadoras]);

  const handleDelete = async (importadora: Importadora) => {
    try {
      const response = await fetch(`/api/importadoras/${importadora.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDeleteConfirm(null);
        fetchImportadoras();
      } else {
        const data = await response.json();
        showAlert({
          type: "error",
          title: "Error",
          message: data.error || "Error al eliminar importadora",
        });
      }
    } catch (error) {
      console.error("Error al eliminar:", error);
      showAlert({
        type: "error",
        title: "Error de conexión",
        message: "Error al eliminar importadora",
      });
    }
  };

  const handleFormSuccess = () => {
    setModalOpen(false);
    setImportadoraEditar(null);
    fetchImportadoras();
  };

  const columns = [
    {
      key: "nombre",
      header: "Nombre",
      render: (item: Importadora) => (
        <span className="font-medium">{item.nombre}</span>
      ),
    },
    {
      key: "descripcion",
      header: "Descripción",
      render: (item: Importadora) => (
        <span className="text-muted">{item.descripcion || "-"}</span>
      ),
    },
    {
      key: "activo",
      header: "Estado",
      render: (item: Importadora) => (
        <span className={item.activo ? "badge badge-success" : "badge badge-error"}>
          {item.activo ? "Activo" : "Inactivo"}
        </span>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (item: Importadora) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setImportadoraEditar(item);
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
        <span className="text-foreground">Importadoras</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Importadoras</h1>
          <p className="text-sm text-muted">
            Gestiona las empresas importadoras
          </p>
        </div>
        <Button
          onClick={() => {
            setImportadoraEditar(null);
            setModalOpen(true);
          }}
        >
          <PlusIcon className="h-4 w-4" />
          Nueva Importadora
        </Button>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={importadoras}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="No hay importadoras registradas"
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setImportadoraEditar(null);
        }}
        title={importadoraEditar ? "Editar Importadora" : "Nueva Importadora"}
      >
        <ImportadoraForm
          importadora={importadoraEditar}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setModalOpen(false);
            setImportadoraEditar(null);
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
            ¿Estás seguro de que deseas eliminar la importadora{" "}
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

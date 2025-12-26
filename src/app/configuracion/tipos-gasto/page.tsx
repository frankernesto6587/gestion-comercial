"use client";

import { useState, useEffect, useCallback } from "react";
import { PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Button, Input, Modal, Table } from "@/components/ui";
import TipoGastoForm from "./TipoGastoForm";
import Link from "next/link";
import { useAlert } from "@/contexts/AlertContext";

interface TipoGasto {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export default function TiposGastoPage() {
  const { showAlert } = useAlert();
  const [tiposGasto, setTiposGasto] = useState<TipoGasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [tipoGastoEditar, setTipoGastoEditar] = useState<TipoGasto | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<TipoGasto | null>(null);

  const fetchTiposGasto = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/tipos-gasto");
      const data = await response.json();
      setTiposGasto(data);
    } catch (error) {
      console.error("Error al cargar tipos de gasto:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTiposGasto();
  }, [fetchTiposGasto]);

  const handleDelete = async (tipoGasto: TipoGasto) => {
    try {
      const response = await fetch(`/api/tipos-gasto/${tipoGasto.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDeleteConfirm(null);
        fetchTiposGasto();
      } else {
        const data = await response.json();
        showAlert({
          type: "error",
          title: "Error",
          message: data.error || "Error al eliminar tipo de gasto",
        });
      }
    } catch (error) {
      console.error("Error al eliminar:", error);
      showAlert({
        type: "error",
        title: "Error de conexión",
        message: "Error al eliminar tipo de gasto",
      });
    }
  };

  const handleFormSuccess = () => {
    setModalOpen(false);
    setTipoGastoEditar(null);
    fetchTiposGasto();
  };

  const columns = [
    {
      key: "nombre",
      header: "Nombre",
      render: (item: TipoGasto) => (
        <span className="font-medium">{item.nombre}</span>
      ),
    },
    {
      key: "descripcion",
      header: "Descripción",
      render: (item: TipoGasto) => (
        <span className="text-muted">{item.descripcion || "-"}</span>
      ),
    },
    {
      key: "activo",
      header: "Estado",
      render: (item: TipoGasto) => (
        <span className={item.activo ? "badge badge-success" : "badge badge-error"}>
          {item.activo ? "Activo" : "Inactivo"}
        </span>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (item: TipoGasto) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setTipoGastoEditar(item);
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
        <span className="text-foreground">Tipos de Gasto</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tipos de Gasto</h1>
          <p className="text-sm text-muted">
            Gestiona los tipos de gasto para las importaciones
          </p>
        </div>
        <Button
          onClick={() => {
            setTipoGastoEditar(null);
            setModalOpen(true);
          }}
        >
          <PlusIcon className="h-4 w-4" />
          Nuevo Tipo de Gasto
        </Button>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={tiposGasto}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="No hay tipos de gasto registrados"
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setTipoGastoEditar(null);
        }}
        title={tipoGastoEditar ? "Editar Tipo de Gasto" : "Nuevo Tipo de Gasto"}
      >
        <TipoGastoForm
          tipoGasto={tipoGastoEditar}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setModalOpen(false);
            setTipoGastoEditar(null);
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
            ¿Estás seguro de que deseas eliminar el tipo de gasto{" "}
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

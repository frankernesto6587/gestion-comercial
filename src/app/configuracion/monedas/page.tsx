"use client";

import { useState, useEffect, useCallback } from "react";
import { PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Button, Input, Modal, Table } from "@/components/ui";
import MonedaForm from "./MonedaForm";
import Link from "next/link";
import { useAlert } from "@/contexts/AlertContext";

interface Moneda {
  id: number;
  codigo: string;
  nombre: string;
  simbolo: string;
  tasaDefecto: number;
  activo: boolean;
}

export default function MonedasPage() {
  const { showAlert } = useAlert();
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [monedaEditar, setMonedaEditar] = useState<Moneda | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Moneda | null>(null);

  const fetchMonedas = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/monedas");
      const data = await response.json();
      setMonedas(data);
    } catch (error) {
      console.error("Error al cargar monedas:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonedas();
  }, [fetchMonedas]);

  const handleDelete = async (moneda: Moneda) => {
    try {
      const response = await fetch(`/api/monedas/${moneda.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDeleteConfirm(null);
        fetchMonedas();
      } else {
        const data = await response.json();
        showAlert({
          type: "error",
          title: "Error",
          message: data.error || "Error al eliminar moneda",
        });
      }
    } catch (error) {
      console.error("Error al eliminar:", error);
      showAlert({
        type: "error",
        title: "Error de conexión",
        message: "Error al eliminar moneda",
      });
    }
  };

  const handleFormSuccess = () => {
    setModalOpen(false);
    setMonedaEditar(null);
    fetchMonedas();
  };

  const columns = [
    {
      key: "codigo",
      header: "Código",
      render: (item: Moneda) => (
        <span className="font-mono font-medium">{item.codigo}</span>
      ),
    },
    {
      key: "nombre",
      header: "Nombre",
    },
    {
      key: "simbolo",
      header: "Símbolo",
      render: (item: Moneda) => (
        <span className="font-mono">{item.simbolo}</span>
      ),
    },
    {
      key: "tasaDefecto",
      header: "Tasa Defecto",
      render: (item: Moneda) => (
        <span className="font-mono">
          {Number(item.tasaDefecto).toLocaleString("es-CU", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          })}
        </span>
      ),
    },
    {
      key: "activo",
      header: "Estado",
      render: (item: Moneda) => (
        <span className={item.activo ? "badge badge-success" : "badge badge-error"}>
          {item.activo ? "Activo" : "Inactivo"}
        </span>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (item: Moneda) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMonedaEditar(item);
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
        <span className="text-foreground">Monedas</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Monedas</h1>
          <p className="text-sm text-muted">
            Gestiona las monedas y sus tasas de cambio por defecto
          </p>
        </div>
        <Button
          onClick={() => {
            setMonedaEditar(null);
            setModalOpen(true);
          }}
        >
          <PlusIcon className="h-4 w-4" />
          Nueva Moneda
        </Button>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={monedas}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="No hay monedas registradas"
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setMonedaEditar(null);
        }}
        title={monedaEditar ? "Editar Moneda" : "Nueva Moneda"}
      >
        <MonedaForm
          moneda={monedaEditar}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setModalOpen(false);
            setMonedaEditar(null);
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
            ¿Estás seguro de que deseas eliminar la moneda{" "}
            <strong>{deleteConfirm?.codigo} - {deleteConfirm?.nombre}</strong>?
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

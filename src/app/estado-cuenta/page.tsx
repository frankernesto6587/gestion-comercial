"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { Button, Input, Modal, Table } from "@/components/ui";
import { useAlert } from "@/contexts/AlertContext";
import Link from "next/link";

interface Transferencia {
  id: number;
  fecha: string;
  monto: string;
  refOrigen: string | null;
  refCorriente: string | null;
  ordenante: string | null;
  ventaId: number | null;
  createdAt: string;
  venta?: {
    id: number;
    fechaInicio: string;
    fechaFin: string;
  } | null;
}

interface ImportResult {
  importadas: number;
  duplicadas: number;
  codigosDuplicados?: string[];
  filasOmitidas: number;
  errores?: string[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function EstadoCuentaPage() {
  const { showAlert } = useAlert();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [totalMonto, setTotalMonto] = useState(0);

  // Filtros
  const [filtros, setFiltros] = useState({
    fechaDesde: "",
    fechaHasta: "",
    disponibles: "",
  });

  // Modal para agregar/editar
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Transferencia | null>(null);
  const [formData, setFormData] = useState({
    fecha: "",
    monto: "",
    refOrigen: "",
    refCorriente: "",
    ordenante: "",
  });
  const [guardando, setGuardando] = useState(false);

  // Modal de confirmación eliminar
  const [deleteConfirm, setDeleteConfirm] = useState<Transferencia | null>(null);

  // Modal de resultado de importación
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const fetchTransferencias = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filtros.fechaDesde && { fechaDesde: filtros.fechaDesde }),
        ...(filtros.fechaHasta && { fechaHasta: filtros.fechaHasta }),
        ...(filtros.disponibles && { disponibles: filtros.disponibles }),
      });

      const response = await fetch(`/api/transferencias?${params}`);
      const data = await response.json();

      setTransferencias(data.data);
      setPagination(data.pagination);
      setTotalMonto(parseFloat(data.totalMonto) || 0);
    } catch (error) {
      console.error("Error al cargar transferencias:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filtros]);

  useEffect(() => {
    fetchTransferencias();
  }, [fetchTransferencias]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchTransferencias();
  };

  const handleOpenModal = (transferencia?: Transferencia) => {
    if (transferencia) {
      setEditando(transferencia);
      setFormData({
        fecha: new Date(transferencia.fecha).toISOString().split("T")[0],
        monto: parseFloat(transferencia.monto).toString(),
        refOrigen: transferencia.refOrigen || "",
        refCorriente: transferencia.refCorriente || "",
        ordenante: transferencia.ordenante || "",
      });
    } else {
      setEditando(null);
      setFormData({
        fecha: new Date().toISOString().split("T")[0],
        monto: "",
        refOrigen: "",
        refCorriente: "",
        ordenante: "",
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditando(null);
    setFormData({ fecha: "", monto: "", refOrigen: "", refCorriente: "", ordenante: "" });
  };

  const handleGuardar = async () => {
    if (!formData.fecha || !formData.monto || parseFloat(formData.monto) <= 0) {
      showAlert({
        type: "warning",
        title: "Campos incompletos",
        message: "Ingrese una fecha y un monto válido",
      });
      return;
    }

    setGuardando(true);
    try {
      const url = editando
        ? `/api/transferencias/${editando.id}`
        : "/api/transferencias";
      const method = editando ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: formData.fecha,
          monto: parseFloat(formData.monto),
          refOrigen: formData.refOrigen || null,
          refCorriente: formData.refCorriente || null,
          ordenante: formData.ordenante || null,
        }),
      });

      if (response.ok) {
        handleCloseModal();
        fetchTransferencias();
        showAlert({
          type: "success",
          title: editando ? "Actualizada" : "Creada",
          message: editando
            ? "Transferencia actualizada correctamente"
            : "Transferencia creada correctamente",
        });
      } else {
        const data = await response.json();
        showAlert({
          type: "error",
          title: "Error",
          message: data.error || "Error al guardar transferencia",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      showAlert({
        type: "error",
        title: "Error de conexión",
        message: "No se pudo conectar con el servidor",
      });
    } finally {
      setGuardando(false);
    }
  };

  const handleDelete = async (transferencia: Transferencia) => {
    try {
      const response = await fetch(`/api/transferencias/${transferencia.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDeleteConfirm(null);
        fetchTransferencias();
        showAlert({
          type: "success",
          title: "Eliminada",
          message: "Transferencia eliminada correctamente",
        });
      } else {
        const data = await response.json();
        showAlert({
          type: "error",
          title: "Error",
          message: data.error || "Error al eliminar transferencia",
        });
      }
    } catch (error) {
      console.error("Error al eliminar:", error);
      showAlert({
        type: "error",
        title: "Error de conexión",
        message: "Error al eliminar transferencia",
      });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);

      const response = await fetch("/api/transferencias/importar", {
        method: "POST",
        body: formDataUpload,
      });

      const data = await response.json();

      if (response.ok) {
        // Mostrar modal con resultado detallado si hay duplicados
        if (data.duplicadas > 0 || data.errores?.length > 0) {
          setImportResult(data);
        } else {
          showAlert({
            type: "success",
            title: "Importación exitosa",
            message: data.message,
          });
        }
        fetchTransferencias();
      } else {
        showAlert({
          type: "error",
          title: "Error en importación",
          message: data.error || "Error al importar archivo",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      showAlert({
        type: "error",
        title: "Error",
        message: "Error al procesar el archivo",
      });
    } finally {
      setImporting(false);
      // Limpiar el input para permitir subir el mismo archivo otra vez
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC", // Evitar conversión de zona horaria
    });
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("es-CU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Calcular total de transferencias visibles
  const totalVisible = transferencias.reduce(
    (sum, t) => sum + parseFloat(t.monto),
    0
  );

  const columns = [
    {
      key: "fecha",
      header: "Fecha",
      render: (item: Transferencia) => formatDate(item.fecha),
    },
    {
      key: "refOrigen",
      header: "Ref. Origen",
      render: (item: Transferencia) => (
        <span className="font-mono text-xs">
          {item.refOrigen || <span className="text-muted">-</span>}
        </span>
      ),
    },
    {
      key: "ordenante",
      header: "Ordenante",
      render: (item: Transferencia) => (
        <span className="text-sm truncate max-w-[150px] block" title={item.ordenante || ""}>
          {item.ordenante || <span className="text-muted">-</span>}
        </span>
      ),
    },
    {
      key: "monto",
      header: "Monto (CUP)",
      render: (item: Transferencia) => (
        <span className="font-mono font-medium">
          {formatCurrency(item.monto)}
        </span>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      render: (item: Transferencia) =>
        item.ventaId ? (
          <span className="badge badge-success flex items-center gap-1">
            <CheckCircleIcon className="h-3 w-3" />
            Usada
          </span>
        ) : (
          <span className="badge badge-info flex items-center gap-1">
            <XCircleIcon className="h-3 w-3" />
            Disponible
          </span>
        ),
    },
    {
      key: "venta",
      header: "Venta",
      render: (item: Transferencia) =>
        item.venta ? (
          <Link
            href={`/ventas/${item.venta.id}`}
            className="text-primary hover:underline"
          >
            #{item.venta.id}
          </Link>
        ) : (
          <span className="text-muted">-</span>
        ),
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (item: Transferencia) => (
        <div className="flex gap-2">
          {item.ventaId ? (
            <Link
              href={`/ventas/${item.ventaId}`}
              className="p-1 text-muted hover:text-primary transition-colors"
              title="Ver venta"
            >
              <EyeIcon className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal(item);
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
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Estado de Cuenta</h1>
          <p className="text-sm text-muted">
            Gestiona las transferencias bancarias
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            {importing ? "Importando..." : "Importar Excel"}
          </Button>
          <Button onClick={() => handleOpenModal()}>
            <PlusIcon className="h-4 w-4" />
            Nueva Transferencia
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          <div className="w-40">
            <Input
              label="Desde"
              type="date"
              value={filtros.fechaDesde}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, fechaDesde: e.target.value }))
              }
            />
          </div>
          <div className="w-40">
            <Input
              label="Hasta"
              type="date"
              value={filtros.fechaHasta}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, fechaHasta: e.target.value }))
              }
            />
          </div>
          <div className="w-40">
            <label className="label">Estado</label>
            <select
              className="input"
              value={filtros.disponibles}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, disponibles: e.target.value }))
              }
            >
              <option value="">Todos</option>
              <option value="true">Disponibles</option>
              <option value="false">Usadas</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" variant="secondary">
              Filtrar
            </Button>
          </div>
        </form>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-muted">Total en pantalla</p>
          <p className="text-2xl font-bold text-primary">
            {formatCurrency(totalVisible)} CUP
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-muted">Total general</p>
          <p className="text-2xl font-bold text-success">
            {formatCurrency(totalMonto)} CUP
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-muted">Transferencias mostradas</p>
          <p className="text-2xl font-bold">{transferencias.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-muted">Total registradas</p>
          <p className="text-2xl font-bold">{pagination.total}</p>
        </div>
      </div>

      {/* Tabla */}
      <Table
        columns={columns}
        data={transferencias}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="No hay transferencias registradas"
      />

      {/* Paginación */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">
            Mostrando {(pagination.page - 1) * pagination.limit + 1} -{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} de{" "}
            {pagination.total} transferencias
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

      {/* Nota sobre formato Excel */}
      <div className="card bg-primary-light border-primary/20">
        <h3 className="font-semibold text-primary mb-2">Formato de Excel para importar</h3>
        <p className="text-sm text-secondary">
          Se importa el extracto bancario de BANDEC. Solo se procesan las transferencias con
          <strong> Canal = &quot;Banca Móvil&quot;</strong> y <strong>Crédito &gt; 0</strong>.
          Las referencias duplicadas se omiten automáticamente.
        </p>
      </div>

      {/* Modal Crear/Editar */}
      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editando ? "Editar Transferencia" : "Nueva Transferencia"}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha"
              type="date"
              value={formData.fecha}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, fecha: e.target.value }))
              }
              required
            />
            <Input
              label="Monto (CUP)"
              type="number"
              step="0.01"
              min={0}
              value={formData.monto}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, monto: e.target.value }))
              }
              placeholder="0.00"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Ref. Origen"
              type="text"
              value={formData.refOrigen}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, refOrigen: e.target.value }))
              }
              placeholder="Ej: KW500H6CUX999"
            />
            <Input
              label="Ref. Corriente"
              type="text"
              value={formData.refCorriente}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, refCorriente: e.target.value }))
              }
              placeholder="Ej: YY50042847598"
            />
          </div>
          <Input
            label="Ordenante"
            type="text"
            value={formData.ordenante}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, ordenante: e.target.value }))
            }
            placeholder="Nombre de quien realizó la transferencia"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button onClick={handleGuardar} loading={guardando}>
              {editando ? "Guardar Cambios" : "Crear"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Confirmar Eliminación */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmar Eliminación"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-foreground">
            ¿Estás seguro de que deseas eliminar la transferencia del{" "}
            <strong>{deleteConfirm && formatDate(deleteConfirm.fecha)}</strong>{" "}
            por <strong>{deleteConfirm && formatCurrency(deleteConfirm.monto)} CUP</strong>?
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

      {/* Modal Resultado de Importación */}
      <Modal
        isOpen={!!importResult}
        onClose={() => setImportResult(null)}
        title="Resultado de Importación"
        size="md"
      >
        {importResult && (
          <div className="space-y-4">
            {/* Resumen */}
            <div className="flex items-center gap-2 text-success">
              <CheckCircleIcon className="h-5 w-5" />
              <span className="font-medium">
                {importResult.importadas} transferencias importadas correctamente
              </span>
            </div>

            {/* Duplicados */}
            {importResult.duplicadas > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-warning">
                  <XCircleIcon className="h-5 w-5" />
                  <span className="font-medium">
                    {importResult.duplicadas} transferencias omitidas (ya existen)
                  </span>
                </div>
                {importResult.codigosDuplicados && importResult.codigosDuplicados.length > 0 && (
                  <details className="bg-card-hover rounded-lg p-3">
                    <summary className="cursor-pointer text-sm font-medium text-muted hover:text-foreground">
                      Ver códigos duplicados ({importResult.codigosDuplicados.length})
                    </summary>
                    <div className="mt-2 max-h-40 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                        {importResult.codigosDuplicados.map((codigo, i) => (
                          <span key={i} className="text-muted">{codigo}</span>
                        ))}
                      </div>
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* Filas omitidas (no Banca Móvil) */}
            {importResult.filasOmitidas > 0 && (
              <p className="text-sm text-muted">
                {importResult.filasOmitidas} filas omitidas (no son Banca Móvil o no son créditos)
              </p>
            )}

            {/* Errores */}
            {importResult.errores && importResult.errores.length > 0 && (
              <details className="bg-error/10 rounded-lg p-3">
                <summary className="cursor-pointer text-sm font-medium text-error">
                  Ver errores ({importResult.errores.length})
                </summary>
                <ul className="mt-2 space-y-1 text-xs text-error">
                  {importResult.errores.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </details>
            )}

            <div className="flex justify-end pt-4">
              <Button onClick={() => setImportResult(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

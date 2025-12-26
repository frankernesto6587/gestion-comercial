"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  MinusIcon,
} from "@heroicons/react/24/outline";
import { Button, Input, Modal, Table } from "@/components/ui";
import { useAlert } from "@/contexts/AlertContext";

interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
  unidadMedida: string;
}

interface Inventario {
  id: number;
  productoId: number;
  cantidadActual: number;
  cantidadMinima: number;
  producto: Producto;
}

interface Stats {
  totalProductos: number;
  productosConStock: number;
  productosSinStock: number;
  productosStockBajo: number;
}

type TipoMovimiento = "ENTRADA" | "SALIDA" | "MERMA" | "AJUSTE_POS" | "AJUSTE_NEG";

const tiposMovimiento: { value: TipoMovimiento; label: string; color: string }[] = [
  { value: "ENTRADA", label: "Entrada", color: "text-success" },
  { value: "SALIDA", label: "Salida", color: "text-error" },
  { value: "MERMA", label: "Merma", color: "text-warning" },
  { value: "AJUSTE_POS", label: "Ajuste (+)", color: "text-info" },
  { value: "AJUSTE_NEG", label: "Ajuste (-)", color: "text-warning" },
];

export default function InventarioPage() {
  const { showAlert } = useAlert();
  const [inventarios, setInventarios] = useState<Inventario[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [soloStockBajo, setSoloStockBajo] = useState(false);

  // Modal de movimiento
  const [movimientoModal, setMovimientoModal] = useState<Inventario | null>(null);
  const [movimientoData, setMovimientoData] = useState({
    tipo: "SALIDA" as TipoMovimiento,
    cantidad: 1,
    motivo: "",
  });
  const [guardando, setGuardando] = useState(false);

  const fetchInventario = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        busqueda,
        stockBajo: soloStockBajo.toString(),
      });

      const response = await fetch(`/api/inventario?${params}`);
      const data = await response.json();

      setInventarios(data.data);
      setStats(data.stats);
    } catch (error) {
      console.error("Error al cargar inventario:", error);
    } finally {
      setLoading(false);
    }
  }, [busqueda, soloStockBajo]);

  useEffect(() => {
    fetchInventario();
  }, [fetchInventario]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInventario();
  };

  const handleGuardarMovimiento = async () => {
    if (!movimientoModal || movimientoData.cantidad <= 0) return;

    setGuardando(true);
    try {
      const response = await fetch(
        `/api/inventario/${movimientoModal.id}/movimientos`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(movimientoData),
        }
      );

      if (response.ok) {
        setMovimientoModal(null);
        setMovimientoData({ tipo: "SALIDA", cantidad: 1, motivo: "" });
        fetchInventario();
      } else {
        const data = await response.json();
        showAlert({
          type: "error",
          title: "Error",
          message: data.error || "Error al registrar movimiento",
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

  const getStockStatus = (inv: Inventario) => {
    if (inv.cantidadActual === 0) return { label: "Sin Stock", class: "badge-error" };
    if (inv.cantidadMinima > 0 && inv.cantidadActual <= inv.cantidadMinima) {
      return { label: "Stock Bajo", class: "badge-warning" };
    }
    return { label: "OK", class: "badge-success" };
  };

  const columns = [
    {
      key: "producto",
      header: "Producto",
      render: (item: Inventario) => (
        <div>
          <p className="font-medium">{item.producto.nombre}</p>
          {item.producto.descripcion && (
            <p className="text-xs text-muted">{item.producto.descripcion}</p>
          )}
        </div>
      ),
    },
    {
      key: "unidad",
      header: "Unidad",
      render: (item: Inventario) => item.producto.unidadMedida,
    },
    {
      key: "cantidadActual",
      header: "Stock Actual",
      render: (item: Inventario) => (
        <span
          className={`font-semibold ${
            item.cantidadActual === 0 ? "text-error" : ""
          }`}
        >
          {item.cantidadActual.toLocaleString()}
        </span>
      ),
    },
    {
      key: "cantidadMinima",
      header: "Mínimo",
      render: (item: Inventario) => item.cantidadMinima.toLocaleString(),
    },
    {
      key: "estado",
      header: "Estado",
      render: (item: Inventario) => {
        const status = getStockStatus(item);
        return <span className={`badge ${status.class}`}>{status.label}</span>;
      },
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (item: Inventario) => (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setMovimientoModal(item);
              setMovimientoData({ tipo: "ENTRADA", cantidad: 1, motivo: "" });
            }}
            className="p-1 text-muted hover:text-success transition-colors"
            title="Entrada"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setMovimientoModal(item);
              setMovimientoData({ tipo: "SALIDA", cantidad: 1, motivo: "" });
            }}
            className="p-1 text-muted hover:text-error transition-colors"
            title="Salida"
          >
            <MinusIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inventario</h1>
        <p className="text-sm text-muted">Control de stock de productos</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-light">
              <ArchiveBoxIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalProductos}</p>
              <p className="text-xs text-muted">Total Productos</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <ArchiveBoxIcon className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.productosConStock}</p>
              <p className="text-xs text-muted">Con Stock</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <ArchiveBoxIcon className="h-5 w-5 text-error" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.productosSinStock}</p>
              <p className="text-xs text-muted">Sin Stock</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <ExclamationTriangleIcon className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.productosStockBajo}</p>
              <p className="text-xs text-muted">Stock Bajo</p>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="card">
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={soloStockBajo}
              onChange={(e) => setSoloStockBajo(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm">Solo stock bajo</span>
          </label>
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </form>
      </div>

      {/* Tabla */}
      <Table
        columns={columns}
        data={inventarios}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="No hay productos en el inventario"
      />

      {/* Modal de movimiento */}
      <Modal
        isOpen={!!movimientoModal}
        onClose={() => setMovimientoModal(null)}
        title="Registrar Movimiento"
      >
        {movimientoModal && (
          <div className="space-y-4">
            <div className="p-3 bg-surface-hover rounded-lg">
              <p className="font-medium">{movimientoModal.producto.nombre}</p>
              <p className="text-sm text-muted">
                Stock actual: {movimientoModal.cantidadActual.toLocaleString()}
              </p>
            </div>

            <div>
              <label className="label">Tipo de Movimiento</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {tiposMovimiento.map((tipo) => (
                  <button
                    key={tipo.value}
                    type="button"
                    onClick={() =>
                      setMovimientoData({ ...movimientoData, tipo: tipo.value })
                    }
                    className={`p-2 rounded-lg border text-sm font-medium transition-colors ${
                      movimientoData.tipo === tipo.value
                        ? "border-primary bg-primary-light text-primary"
                        : "border-border hover:bg-surface-hover"
                    }`}
                  >
                    {tipo.label}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Cantidad"
              type="number"
              min={1}
              value={movimientoData.cantidad}
              onChange={(e) =>
                setMovimientoData({
                  ...movimientoData,
                  cantidad: Number(e.target.value),
                })
              }
              required
            />

            <Input
              label="Motivo (opcional)"
              placeholder="Ej: Venta, Ajuste de inventario..."
              value={movimientoData.motivo}
              onChange={(e) =>
                setMovimientoData({ ...movimientoData, motivo: e.target.value })
              }
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => setMovimientoModal(null)}
              >
                Cancelar
              </Button>
              <Button onClick={handleGuardarMovimiento} loading={guardando}>
                Registrar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { Button, Input, Select, SelectOption, TooltipFormula } from "@/components/ui";
import { useAlert } from "@/contexts/AlertContext";

// ============================================
// INTERFACES
// ============================================

interface Calculos {
  costoUnitarioUSD: number;
  costoUnitarioCUP: number;
  costoBrutoUnitario: number;
  cantidadVendible: number;
  cantidadMerma: number;
  cantidadVentaUSD: number;
  cantidadVentaFiscal: number;
  cantidadVentaEfectivo: number;
  precioVentaUSD: number;
  precioVentaCUP: number;
  precioFiscalCUP: number;
  precioEfectivoCUP: number;
  ventaUSDEnCUP: number;
  ventaFiscalCUP: number;
  ventaEfectivoCUP: number;
  ventaTotalFiscal: number;
  costoProductosCUP: number;
  otrosGastosPorciento: number;
  costoTotalBruto: number;
  aporte11Porciento: number;
  impuesto35Utilidad: number;
  totalImpuestos: number;
  cargaTributaria: number;
  utilidadEstimada: number;
  porcentajeUtilidadEstimada: number;
  utilidadBrutaReal: number;
  inversionTotal: number;
  ventasTotalesUSD: number;
  ventasTotalesCUP: number;
  utilidadBrutaUSD: number;
  utilidadBrutaCUP: number;
  porcentajeUtilidad: number;
  unidadesParaRecuperar: number;
  porcentajeUnidadesRecuperar: number;
}

interface ProductoImportado {
  id: number;
  producto: {
    id: number;
    nombre: string;
    descripcion: string | null;
  };
  cantidadUnidades: number;
  importeUSD: string;
  porcentajeMerma: string;
  margenUtilidad: string;
  mediaPrecioFiscal: string;
  mediaPrecioFiscalEfectivo: string;
  ventaRealEstimada: string | null;
  gastosPorrateadosCUP: number;
  calculos: Calculos;
}

interface Gasto {
  id: number;
  tipoGasto: { id: number; nombre: string };
  moneda: { id: number; codigo: string; nombre: string };
  monto: string;
  descripcion: string | null;
}

interface TasaCambio {
  id: number;
  moneda: { id: number; codigo: string; nombre: string };
  tasaCambio: string;
}

interface TotalesContenedor {
  cantidadVendible: number;
  cantidadMerma: number;
  cantidadVentaUSD: number;
  cantidadVentaFiscal: number;
  cantidadVentaEfectivo: number;
  ventaUSDEnCUP: number;
  ventaFiscalCUP: number;
  ventaEfectivoCUP: number;
  ventaTotalFiscal: number;
  costoProductosCUP: number;
  otrosGastosPorciento: number;
  costoTotalBruto: number;
  aporte11Porciento: number;
  impuesto35Utilidad: number;
  totalImpuestos: number;
  cargaTributaria: number;
  utilidadEstimada: number;
  porcentajeUtilidadEstimada: number;
  utilidadBrutaReal: number;
  inversionTotal: number;
  totalVentaRealEstimada: number;
}

interface Importacion {
  id: number;
  fecha: string;
  numeroContenedor: string | null;
  importadora: {
    id: number;
    nombre: string;
  };
  observaciones: string | null;
  productos: ProductoImportado[];
  gastos: Gasto[];
  tasasCambio: TasaCambio[];
  totales: {
    totalUSD: number;
    totalUnidades: number;
    totalGastosCUP: number;
    tasaCambioUSD: number;
    cantidadProductos: number;
  };
  totalesContenedor: TotalesContenedor;
  porcentajes: {
    porcentajeVentaUSD: number;
    porcentajeVentaFiscal: number;
    porcentajeVentaEfectivo: number;
    porcentajeMargenComercial: number;
    porcentajeMerma: number;
    porcentajeMargenUtilidad: number;
    porcentajeAporteMasMargen: number;
    porcentajeOtrosGastos: number;
  };
}

interface TipoGasto {
  id: number;
  nombre: string;
}

interface Moneda {
  id: number;
  codigo: string;
  nombre: string;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function DetalleImportacionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { showAlert } = useAlert();
  const [importacion, setImportacion] = useState<Importacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [productoExpandido, setProductoExpandido] = useState<number | null>(null);
  const [mostrarGastos, setMostrarGastos] = useState(true);

  // Para agregar gastos
  const [tiposGasto, setTiposGasto] = useState<TipoGasto[]>([]);
  const [monedasDisponibles, setMonedasDisponibles] = useState<Moneda[]>([]);
  const [nuevoGasto, setNuevoGasto] = useState({
    tipoGastoId: 0,
    monedaId: 0,
    monto: 0,
    descripcion: "",
  });
  const [guardandoGasto, setGuardandoGasto] = useState(false);

  // Para editar porcentajes
  const [mostrarPorcentajes, setMostrarPorcentajes] = useState(false);
  const [porcentajesEditables, setPorcentajesEditables] = useState({
    porcentajeVentaUSD: 91,
    porcentajeVentaFiscal: 5,
    porcentajeVentaEfectivo: 4,
    porcentajeMerma: 2,
    porcentajeMargenUtilidad: 4,
    porcentajeAporteMasMargen: 15,
    porcentajeMargenComercial: 85,
    porcentajeOtrosGastos: 10,
  });
  const [guardandoPorcentajes, setGuardandoPorcentajes] = useState(false);

  // Para exportar Excel
  const [exportandoExcel, setExportandoExcel] = useState(false);

  // Para editar tasas de cambio
  const [mostrarTasas, setMostrarTasas] = useState(false);
  const [tasasEditables, setTasasEditables] = useState<{ monedaId: number; tasaCambio: number }[]>([]);
  const [guardandoTasas, setGuardandoTasas] = useState(false);

  // ============================================
  // CARGAR DATOS
  // ============================================

  const fetchImportacion = async () => {
    try {
      const response = await fetch(`/api/importaciones/${id}`);
      if (response.ok) {
        const data = await response.json();
        setImportacion(data);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImportacion();

    // Cargar tipos de gasto y monedas
    const fetchCatalogos = async () => {
      try {
        const [tiposRes, monedasRes] = await Promise.all([
          fetch("/api/tipos-gasto?activo=true"),
          fetch("/api/monedas?activo=true"),
        ]);
        const [tiposData, monedasData] = await Promise.all([
          tiposRes.json(),
          monedasRes.json(),
        ]);
        setTiposGasto(tiposData || []);
        setMonedasDisponibles(monedasData || []);
      } catch (error) {
        console.error("Error al cargar catálogos:", error);
      }
    };
    fetchCatalogos();
  }, [id]);

  // Sincronizar porcentajes editables cuando carga la importación
  useEffect(() => {
    if (importacion) {
      setPorcentajesEditables({
        porcentajeVentaUSD: importacion.porcentajes.porcentajeVentaUSD,
        porcentajeVentaFiscal: importacion.porcentajes.porcentajeVentaFiscal,
        porcentajeVentaEfectivo: importacion.porcentajes.porcentajeVentaEfectivo,
        porcentajeMerma: importacion.porcentajes.porcentajeMerma,
        porcentajeMargenUtilidad: importacion.porcentajes.porcentajeMargenUtilidad,
        porcentajeAporteMasMargen: importacion.porcentajes.porcentajeAporteMasMargen,
        porcentajeMargenComercial: importacion.porcentajes.porcentajeMargenComercial,
        porcentajeOtrosGastos: importacion.porcentajes.porcentajeOtrosGastos,
      });

      // Sincronizar tasas de cambio
      setTasasEditables(
        importacion.tasasCambio.map((t) => ({
          monedaId: t.moneda.id,
          tasaCambio: parseFloat(t.tasaCambio),
        }))
      );
    }
  }, [importacion]);

  // ============================================
  // HANDLERS GASTOS
  // ============================================

  const handleAgregarGasto = async () => {
    if (!nuevoGasto.tipoGastoId || !nuevoGasto.monedaId || nuevoGasto.monto <= 0) {
      showAlert({
        type: "warning",
        title: "Campos incompletos",
        message: "Complete todos los campos del gasto",
      });
      return;
    }

    setGuardandoGasto(true);
    try {
      const response = await fetch(`/api/importaciones/${id}/gastos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevoGasto),
      });

      if (response.ok) {
        // Recargar importación con los nuevos cálculos
        await fetchImportacion();
        setNuevoGasto({ tipoGastoId: 0, monedaId: 0, monto: 0, descripcion: "" });
      } else {
        const data = await response.json();
        showAlert({
          type: "error",
          title: "Error",
          message: data.error || "Error al agregar gasto",
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
      setGuardandoGasto(false);
    }
  };

  const handleEliminarGasto = async (gastoId: number) => {
    if (!confirm("¿Eliminar este gasto? Se recalcularán los precios.")) return;

    try {
      const response = await fetch(`/api/importaciones/${id}/gastos/${gastoId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchImportacion();
      } else {
        const data = await response.json();
        showAlert({
          type: "error",
          title: "Error",
          message: data.error || "Error al eliminar gasto",
        });
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // ============================================
  // HANDLERS PORCENTAJES
  // ============================================

  const sumaVentas =
    porcentajesEditables.porcentajeVentaUSD +
    porcentajesEditables.porcentajeVentaFiscal +
    porcentajesEditables.porcentajeVentaEfectivo;

  const handleGuardarPorcentajes = async () => {
    // Validar que ventas sumen 100%
    if (sumaVentas !== 100) {
      showAlert({
        type: "warning",
        title: "Suma incorrecta",
        message: `Los porcentajes de venta deben sumar 100%. Actualmente suman ${sumaVentas}%`,
      });
      return;
    }

    setGuardandoPorcentajes(true);
    try {
      const response = await fetch(`/api/importaciones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(porcentajesEditables),
      });

      if (response.ok) {
        showAlert({
          type: "success",
          title: "Guardado",
          message: "Porcentajes actualizados. Los precios han sido recalculados.",
        });
        await fetchImportacion();
      } else {
        const data = await response.json();
        showAlert({
          type: "error",
          title: "Error",
          message: data.error || "Error al guardar porcentajes",
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
      setGuardandoPorcentajes(false);
    }
  };

  // ============================================
  // HANDLERS TASAS DE CAMBIO
  // ============================================

  const handleGuardarTasas = async () => {
    if (tasasEditables.length === 0) {
      showAlert({
        type: "warning",
        title: "Sin tasas",
        message: "No hay tasas de cambio para guardar",
      });
      return;
    }

    setGuardandoTasas(true);
    try {
      const response = await fetch(`/api/importaciones/${id}/tasas-cambio`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasas: tasasEditables }),
      });

      if (response.ok) {
        showAlert({
          type: "success",
          title: "Guardado",
          message: "Tasas de cambio actualizadas. Los precios han sido recalculados.",
        });
        await fetchImportacion();
      } else {
        const data = await response.json();
        showAlert({
          type: "error",
          title: "Error",
          message: data.error || "Error al guardar tasas de cambio",
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
      setGuardandoTasas(false);
    }
  };

  const handleTasaChange = (monedaId: number, valor: number) => {
    setTasasEditables((prev) =>
      prev.map((t) => (t.monedaId === monedaId ? { ...t, tasaCambio: valor } : t))
    );
  };

  // ============================================
  // HANDLER EXPORTAR EXCEL
  // ============================================

  const handleExportExcel = async () => {
    setExportandoExcel(true);
    try {
      const response = await fetch(`/api/importaciones/${id}/excel`);

      if (!response.ok) {
        const data = await response.json();
        showAlert({
          type: "error",
          title: "Error",
          message: data.error || "Error al exportar a Excel",
        });
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Obtener nombre del archivo del header o generar uno
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `importacion_${id}.xlsx`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      showAlert({
        type: "success",
        title: "Exportado",
        message: "El archivo Excel se ha descargado correctamente",
      });
    } catch (error) {
      console.error("Error:", error);
      showAlert({
        type: "error",
        title: "Error de conexión",
        message: "No se pudo descargar el archivo",
      });
    } finally {
      setExportandoExcel(false);
    }
  };

  // ============================================
  // FORMATTERS
  // ============================================

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatCurrency = (value: number | string | undefined, currency: string = "USD") => {
    if (value === undefined) return "-";
    const num = typeof value === "string" ? parseFloat(value) : value;
    const formatted = num.toLocaleString("es-CU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
    return currency === "USD" ? `$${formatted}` : `${formatted} ${currency}`;
  };

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!importacion) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Importación no encontrada</p>
        <Link href="/importaciones" className="text-primary hover:underline mt-2 inline-block">
          Volver a importaciones
        </Link>
      </div>
    );
  }

  const { totales, totalesContenedor, porcentajes } = importacion;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/importaciones"
            className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Contenedor #{importacion.id}
            </h1>
            <p className="text-sm text-muted">{formatDate(importacion.fecha)}</p>
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={handleExportExcel}
          loading={exportandoExcel}
        >
          <DocumentArrowDownIcon className="h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      {/* Resumen Principal */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-muted">Importadora</p>
          <p className="text-xl font-semibold">{importacion.importadora?.nombre || "-"}</p>
        </div>
        <div className="card">
          <p className="text-sm text-muted">Contenedor</p>
          <p className="text-xl font-semibold">{importacion.numeroContenedor || "-"}</p>
        </div>
        <div className="card">
          <p className="text-sm text-muted">Total Invertido USD</p>
          <p className="text-xl font-semibold text-primary">
            {formatCurrency(totales.totalUSD)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-muted">Total Unidades</p>
          <p className="text-xl font-semibold">
            {totales.totalUnidades.toLocaleString()}
          </p>
        </div>
      </div>

      {importacion.observaciones && (
        <div className="card">
          <p className="text-sm text-muted">Observaciones</p>
          <p className="mt-1">{importacion.observaciones}</p>
        </div>
      )}

      {/* Gastos Asociados (con formulario para agregar) */}
      <div className="card">
        <button
          type="button"
          onClick={() => setMostrarGastos(!mostrarGastos)}
          className="w-full flex items-center justify-between text-left"
        >
          <div>
            <h2 className="text-lg font-semibold">Gastos Asociados al Contenedor</h2>
            <p className="text-sm text-muted">
              Total: {formatCurrency(totales.totalGastosCUP, "CUP")}
            </p>
          </div>
          {mostrarGastos ? (
            <ChevronUpIcon className="h-5 w-5 text-muted" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-muted" />
          )}
        </button>

        {mostrarGastos && (
          <div className="mt-4 pt-4 border-t border-border">
            {/* Lista de gastos actuales */}
            {importacion.gastos.length > 0 && (
              <div className="table-container mb-4">
                <table className="table text-sm">
                  <thead>
                    <tr>
                      <th>Tipo de Gasto</th>
                      <th>Descripción</th>
                      <th>Monto</th>
                      <th>Moneda</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {importacion.gastos.map((g) => (
                      <tr key={g.id}>
                        <td className="font-medium">{g.tipoGasto.nombre}</td>
                        <td className="text-muted">{g.descripcion || "-"}</td>
                        <td className="font-mono">{formatCurrency(parseFloat(g.monto), g.moneda.codigo)}</td>
                        <td>{g.moneda.codigo}</td>
                        <td>
                          <button
                            onClick={() => handleEliminarGasto(g.id)}
                            className="p-1 text-muted hover:text-error transition-colors"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Formulario agregar gasto */}
            <div className="bg-surface-hover rounded-lg p-4">
              <h3 className="font-medium mb-3">Agregar Nuevo Gasto</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Select
                  label="Tipo de Gasto"
                  value={
                    nuevoGasto.tipoGastoId
                      ? {
                          value: nuevoGasto.tipoGastoId,
                          label: tiposGasto.find((t) => t.id === nuevoGasto.tipoGastoId)?.nombre || "",
                        }
                      : null
                  }
                  onChange={(opt) => setNuevoGasto({ ...nuevoGasto, tipoGastoId: opt ? Number(opt.value) : 0 })}
                  options={tiposGasto.map((t) => ({ value: t.id, label: t.nombre }))}
                  placeholder="Seleccionar..."
                />
                <Select
                  label="Moneda"
                  value={
                    nuevoGasto.monedaId
                      ? {
                          value: nuevoGasto.monedaId,
                          label: monedasDisponibles.find((m) => m.id === nuevoGasto.monedaId)?.codigo || "",
                        }
                      : null
                  }
                  onChange={(opt) => setNuevoGasto({ ...nuevoGasto, monedaId: opt ? Number(opt.value) : 0 })}
                  options={monedasDisponibles.map((m) => ({ value: m.id, label: `${m.codigo} - ${m.nombre}` }))}
                  placeholder="Moneda..."
                />
                <Input
                  label="Monto"
                  type="number"
                  step="0.01"
                  min={0}
                  value={nuevoGasto.monto || ""}
                  onChange={(e) => setNuevoGasto({ ...nuevoGasto, monto: Number(e.target.value) })}
                />
                <Input
                  label="Descripción"
                  placeholder="Ej: DUA 12345"
                  value={nuevoGasto.descripcion}
                  onChange={(e) => setNuevoGasto({ ...nuevoGasto, descripcion: e.target.value })}
                />
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAgregarGasto}
                    loading={guardandoGasto}
                    className="w-full"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Agregar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tasas de Cambio (Editables) */}
      <div className="card">
        <button
          type="button"
          onClick={() => setMostrarTasas(!mostrarTasas)}
          className="w-full flex items-center justify-between text-left"
        >
          <div>
            <h2 className="text-lg font-semibold">Tasas de Cambio</h2>
            <p className="text-sm text-muted">
              Tasa USD: {totales.tasaCambioUSD} CUP
            </p>
          </div>
          {mostrarTasas ? (
            <ChevronUpIcon className="h-5 w-5 text-muted" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-muted" />
          )}
        </button>

        {mostrarTasas && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {importacion.tasasCambio.map((tasa) => {
                const tasaEditable = tasasEditables.find((t) => t.monedaId === tasa.moneda.id);
                return (
                  <div key={tasa.id}>
                    <label className="block text-sm font-medium text-muted mb-1">
                      {tasa.moneda.codigo} - {tasa.moneda.nombre}
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={tasaEditable?.tasaCambio ?? parseFloat(tasa.tasaCambio)}
                      onChange={(e) => handleTasaChange(tasa.moneda.id, Number(e.target.value))}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleGuardarTasas}
                loading={guardandoTasas}
              >
                Guardar Tasas
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Productos */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">
          Productos ({importacion.productos.length})
        </h2>
        <div className="table-container overflow-x-auto">
          <table className="table text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 bg-surface z-10">Producto</th>
                <th>Cantidad</th>
                <th>Cant. Vendible</th>
                <th>Importe USD</th>
                <th>Gastos Prorr.</th>
                <th>Costo Unit.</th>
                <th>Precio USD</th>
                <th>Precio CUP</th>
                <th>Precio Fiscal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {importacion.productos.map((prod) => (
                <tr key={prod.id} className="hover:bg-surface-hover">
                  <td className="font-medium sticky left-0 bg-surface">
                    <div>
                      {prod.producto.nombre}
                      {prod.producto.descripcion && (
                        <span className="text-muted text-xs block">{prod.producto.descripcion}</span>
                      )}
                    </div>
                  </td>
                  <td>{prod.cantidadUnidades.toLocaleString()}</td>
                  <td>{prod.calculos.cantidadVendible.toLocaleString("es-CU", { maximumFractionDigits: 0 })}</td>
                  <td>{formatCurrency(prod.importeUSD)}</td>
                  <td className="text-muted">{formatCurrency(prod.gastosPorrateadosCUP, "CUP")}</td>
                  <td>{formatCurrency(prod.calculos.costoUnitarioUSD)}</td>
                  <td className="font-medium text-success">{formatCurrency(prod.calculos.precioVentaUSD)}</td>
                  <td className="font-medium text-primary">{formatCurrency(prod.calculos.precioVentaCUP, "CUP")}</td>
                  <td>{formatCurrency(prod.calculos.precioFiscalCUP, "CUP")}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-surface-hover font-semibold">
                <td className="sticky left-0 bg-surface-hover">TOTAL</td>
                <td>{totales.totalUnidades.toLocaleString()}</td>
                <td>{totalesContenedor.cantidadVendible.toLocaleString("es-CU", { maximumFractionDigits: 0 })}</td>
                <td>{formatCurrency(totales.totalUSD)}</td>
                <td>{formatCurrency(totales.totalGastosCUP, "CUP")}</td>
                <td colSpan={4}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Porcentajes de Cálculo (Editables) */}
      <div className="card">
        <button
          type="button"
          onClick={() => setMostrarPorcentajes(!mostrarPorcentajes)}
          className="w-full flex items-center justify-between text-left"
        >
          <div>
            <h2 className="text-lg font-semibold">Porcentajes de Cálculo</h2>
            <p className="text-sm text-muted">
              Edita los porcentajes para recalcular precios
            </p>
          </div>
          {mostrarPorcentajes ? (
            <ChevronUpIcon className="h-5 w-5 text-muted" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-muted" />
          )}
        </button>

        {mostrarPorcentajes && (
          <div className="mt-4 pt-4 border-t border-border space-y-6">
            {/* Distribución de Ventas */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-medium">Distribución de Ventas</h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    sumaVentas === 100
                      ? "bg-success/20 text-success"
                      : "bg-error/20 text-error"
                  }`}
                >
                  Suma: {sumaVentas}% {sumaVentas === 100 ? "✓" : "✗"}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="% Venta USD"
                  type="number"
                  min={0}
                  max={100}
                  value={porcentajesEditables.porcentajeVentaUSD}
                  onChange={(e) =>
                    setPorcentajesEditables({
                      ...porcentajesEditables,
                      porcentajeVentaUSD: Number(e.target.value),
                    })
                  }
                />
                <Input
                  label="% Venta Fiscal"
                  type="number"
                  min={0}
                  max={100}
                  value={porcentajesEditables.porcentajeVentaFiscal}
                  onChange={(e) =>
                    setPorcentajesEditables({
                      ...porcentajesEditables,
                      porcentajeVentaFiscal: Number(e.target.value),
                    })
                  }
                />
                <Input
                  label="% Venta Efectivo"
                  type="number"
                  min={0}
                  max={100}
                  value={porcentajesEditables.porcentajeVentaEfectivo}
                  onChange={(e) =>
                    setPorcentajesEditables({
                      ...porcentajesEditables,
                      porcentajeVentaEfectivo: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            {/* Otros Porcentajes */}
            <div>
              <h3 className="font-medium mb-3">Otros Porcentajes</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Input
                  label="% Merma"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={porcentajesEditables.porcentajeMerma}
                  onChange={(e) =>
                    setPorcentajesEditables({
                      ...porcentajesEditables,
                      porcentajeMerma: Number(e.target.value),
                    })
                  }
                />
                <Input
                  label="% Margen Utilidad"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={porcentajesEditables.porcentajeMargenUtilidad}
                  onChange={(e) =>
                    setPorcentajesEditables({
                      ...porcentajesEditables,
                      porcentajeMargenUtilidad: Number(e.target.value),
                    })
                  }
                />
                <Input
                  label="% 11% + MU"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={porcentajesEditables.porcentajeAporteMasMargen}
                  onChange={(e) =>
                    setPorcentajesEditables({
                      ...porcentajesEditables,
                      porcentajeAporteMasMargen: Number(e.target.value),
                    })
                  }
                />
                <Input
                  label="% Margen Comercial"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={porcentajesEditables.porcentajeMargenComercial}
                  onChange={(e) =>
                    setPorcentajesEditables({
                      ...porcentajesEditables,
                      porcentajeMargenComercial: Number(e.target.value),
                    })
                  }
                />
                <Input
                  label="% Otros Gastos"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={porcentajesEditables.porcentajeOtrosGastos}
                  onChange={(e) =>
                    setPorcentajesEditables({
                      ...porcentajesEditables,
                      porcentajeOtrosGastos: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            {/* Botón Guardar */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleGuardarPorcentajes}
                loading={guardandoPorcentajes}
                disabled={sumaVentas !== 100}
              >
                Guardar Cambios
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Distribución de Ventas por Canal */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Distribución de Ventas por Canal</h2>
        <div className="overflow-x-auto">
          <table className="table text-sm">
            <thead>
              <tr>
                <th>Canal</th>
                <th>% Leyenda</th>
                <th>Cantidad</th>
                <th>Venta Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="font-medium">Venta USD</td>
                <td>{porcentajes.porcentajeVentaUSD}%</td>
                <td>{totalesContenedor.cantidadVentaUSD.toLocaleString("es-CU", { maximumFractionDigits: 0 })}</td>
                <td className="font-medium text-primary">{formatCurrency(totalesContenedor.ventaUSDEnCUP, "CUP")}</td>
              </tr>
              <tr>
                <td className="font-medium">Venta Fiscal</td>
                <td>{porcentajes.porcentajeVentaFiscal}%</td>
                <td>{totalesContenedor.cantidadVentaFiscal.toLocaleString("es-CU", { maximumFractionDigits: 0 })}</td>
                <td className="font-medium">{formatCurrency(totalesContenedor.ventaFiscalCUP, "CUP")}</td>
              </tr>
              <tr>
                <td className="font-medium">Venta Efectivo</td>
                <td>{porcentajes.porcentajeVentaEfectivo}%</td>
                <td>{totalesContenedor.cantidadVentaEfectivo.toLocaleString("es-CU", { maximumFractionDigits: 0 })}</td>
                <td className="font-medium">{formatCurrency(totalesContenedor.ventaEfectivoCUP, "CUP")}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-primary/10 font-semibold">
                <td colSpan={3}>VENTA TOTAL FISCAL</td>
                <td className="text-primary text-lg">{formatCurrency(totalesContenedor.ventaTotalFiscal, "CUP")}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Costos e Impuestos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold mb-3">Costos</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Costo Productos (USD→CUP)</span>
              <span className="font-mono">{formatCurrency(totalesContenedor.costoProductosCUP, "CUP")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Gastos Contenedor</span>
              <span className="font-mono">{formatCurrency(totales.totalGastosCUP, "CUP")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">+11% Aporte (deducible)</span>
              <span className="font-mono">{formatCurrency(totalesContenedor.aporte11Porciento, "CUP")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">+10% Otros Gastos</span>
              <span className="font-mono">{formatCurrency(totalesContenedor.otrosGastosPorciento, "CUP")}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border font-semibold">
              <span>Costo Total Bruto</span>
              <span className="text-error">{formatCurrency(totalesContenedor.costoTotalBruto, "CUP")}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-3">Impuestos</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">11% Aporte sobre Ventas</span>
              <span className="font-mono">{formatCurrency(totalesContenedor.aporte11Porciento, "CUP")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">35% Impuesto Utilidad</span>
              <span className="font-mono">{formatCurrency(totalesContenedor.impuesto35Utilidad, "CUP")}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border font-semibold">
              <span>Total Impuestos</span>
              <span className="text-error">{formatCurrency(totalesContenedor.totalImpuestos, "CUP")}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Carga Tributaria</span>
              <span>{totalesContenedor.cargaTributaria.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Análisis de Utilidad */}
      <div className="card bg-gradient-to-r from-primary/10 to-success/10">
        <h3 className="font-semibold mb-3">Análisis de Utilidad</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted block">Utilidad Estimada</span>
            <span className="font-mono font-bold text-lg">{formatCurrency(totalesContenedor.utilidadEstimada, "CUP")}</span>
          </div>
          <div>
            <span className="text-muted block">% Utilidad</span>
            <span className="font-mono font-bold text-lg">{totalesContenedor.porcentajeUtilidadEstimada.toFixed(2)}%</span>
          </div>
          <div>
            <span className="text-muted block">Total Impuestos</span>
            <span className="font-mono font-bold text-lg text-error">{formatCurrency(totalesContenedor.totalImpuestos, "CUP")}</span>
          </div>
          <div>
            <span className="text-muted block">Utilidad Bruta Real</span>
            <span className={`font-mono font-bold text-lg ${totalesContenedor.utilidadBrutaReal >= 0 ? "text-success" : "text-error"}`}>
              {formatCurrency(totalesContenedor.utilidadBrutaReal, "CUP")}
            </span>
          </div>
        </div>
      </div>

      {/* Venta Real Estimada (si existe) */}
      {totalesContenedor.totalVentaRealEstimada > 0 && (
        <div className="card bg-warning/10 border border-warning/30">
          <h3 className="font-semibold mb-3">Análisis sobre Venta Real Estimada</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted block">Venta Real Estimada</span>
              <span className="font-mono font-bold text-lg">{formatCurrency(totalesContenedor.totalVentaRealEstimada, "CUP")}</span>
            </div>
            <div>
              <span className="text-muted block">Total Impuestos</span>
              <span className="font-mono font-bold text-lg text-error">{formatCurrency(totalesContenedor.totalImpuestos, "CUP")}</span>
            </div>
            <div>
              <span className="text-muted block">Carga sobre Venta Real</span>
              <span className="font-mono font-bold text-lg text-warning">
                {((totalesContenedor.totalImpuestos / totalesContenedor.totalVentaRealEstimada) * 100).toFixed(2)}%
              </span>
            </div>
            <div>
              <span className="text-muted block">Utilidad s/Venta Real</span>
              <span className={`font-mono font-bold text-lg ${(totalesContenedor.totalVentaRealEstimada - totalesContenedor.costoTotalBruto - totalesContenedor.totalImpuestos) >= 0 ? "text-success" : "text-error"}`}>
                {formatCurrency(totalesContenedor.totalVentaRealEstimada - totalesContenedor.costoTotalBruto - totalesContenedor.totalImpuestos, "CUP")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Resumen de Inversión */}
      <div className="card">
        <h3 className="font-semibold mb-3">Resumen de Inversión</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted block">Importe Total USD</span>
            <span className="font-mono font-bold text-lg">{formatCurrency(totales.totalUSD)}</span>
          </div>
          <div>
            <span className="text-muted block">Importe en CUP (@ {totales.tasaCambioUSD})</span>
            <span className="font-mono font-bold text-lg">{formatCurrency(totales.totalUSD * totales.tasaCambioUSD, "CUP")}</span>
          </div>
          <div>
            <span className="text-muted block">Total Gastos CUP</span>
            <span className="font-mono font-bold text-lg">{formatCurrency(totales.totalGastosCUP, "CUP")}</span>
          </div>
          <div>
            <span className="text-muted block">Inversión Total CUP</span>
            <span className="font-mono font-bold text-lg text-primary">
              {formatCurrency(totalesContenedor.inversionTotal * totales.tasaCambioUSD, "CUP")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

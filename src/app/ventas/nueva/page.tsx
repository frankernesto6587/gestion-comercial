"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CalculatorIcon,
  CheckIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { Button, Input, Modal } from "@/components/ui";
import { useAlert } from "@/contexts/AlertContext";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

interface ProductoStock {
  productoId: number;
  nombre: string;
  stock: number;
}

interface TransferenciaDisponible {
  id: number;
  fecha: string;
  monto: string;
  seleccionada: boolean;
}

interface ProductoDistribucion {
  productoId: number;
  nombre: string;
  porcentaje: number;
  stock: number;
  seleccionado: boolean;
}

interface LineaVentaPreview {
  fecha: string;
  productoId: number;
  productoImportadoId: number;
  nombreProducto: string;
  canal: "USD" | "FISCAL" | "EFECTIVO";
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

interface DistribucionResult {
  totalTransferencias: number;
  totalUnidades: number;
  totalCUP: number;
  lineasVenta: LineaVentaPreview[];
  validacionStock: {
    valido: boolean;
    errores: string[];
  };
  totalesPorProducto: Record<
    number,
    {
      nombre: string;
      usd: { cantidad: number; subtotal: number };
      fiscal: { cantidad: number; subtotal: number };
      efectivo: { cantidad: number; subtotal: number };
      total: { cantidad: number; subtotal: number };
    }
  >;
  totalesGenerales: {
    usd: { cantidad: number; subtotal: number };
    fiscal: { cantidad: number; subtotal: number };
    efectivo: { cantidad: number; subtotal: number };
    total: { cantidad: number; subtotal: number };
  };
}

interface ConflictoFechas {
  transferencia: { fecha: string; monto: number };
  productosExcluidos: {
    productoId: number;
    nombre: string;
    fechaImportacion: string;
    motivo: string;
  }[];
}

export default function NuevaVentaPage() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [paso, setPaso] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Paso 1: Configuración
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [transferenciasDisponibles, setTransferenciasDisponibles] = useState<TransferenciaDisponible[]>([]);
  const [cargandoTransferencias, setCargandoTransferencias] = useState(false);
  const [productos, setProductos] = useState<ProductoDistribucion[]>([]);
  const [modoDistribucion, setModoDistribucion] = useState<"MANUAL" | "AUTO">(
    "MANUAL"
  );
  const [observaciones, setObservaciones] = useState("");

  // Paso 2: Preview
  const [preview, setPreview] = useState<DistribucionResult | null>(null);

  // Estado para carga de productos
  const [cargandoProductos, setCargandoProductos] = useState(false);

  // Estado para modal de conflictos de fechas
  const [conflictosFechas, setConflictosFechas] = useState<ConflictoFechas[]>([]);
  const [mostrarModalConflictos, setMostrarModalConflictos] = useState(false);
  const [datosParaCalculo, setDatosParaCalculo] = useState<{
    transferencias: { fecha: string; monto: number }[];
    productos: { productoId: number; porcentaje: number }[];
  } | null>(null);

  // Estado para límites de porcentaje por producto
  const [limitesPorcentaje, setLimitesPorcentaje] = useState<Record<number, number>>({});
  const [mostrarModalLimite, setMostrarModalLimite] = useState(false);
  const [productoExcedido, setProductoExcedido] = useState<{
    nombre: string;
    porcentajeIngresado: number;
    porcentajeMaximo: number;
  } | null>(null);

  // Cargar productos con stock cuando cambia fechaFin
  useEffect(() => {
    const fetchProductos = async () => {
      // Si no hay fechaFin, limpiar productos
      if (!fechaFin) {
        setProductos([]);
        return;
      }

      setCargandoProductos(true);
      try {
        const params = new URLSearchParams({ fechaFin });
        const response = await fetch(`/api/ventas/productos-stock?${params}`);
        const data = await response.json();
        setProductos(
          data.map((p: ProductoStock) => ({
            productoId: p.productoId,
            nombre: p.nombre,
            porcentaje: 0,
            stock: p.stock,
            seleccionado: false,
          }))
        );
      } catch (error) {
        console.error("Error al cargar productos:", error);
      } finally {
        setCargandoProductos(false);
      }
    };
    fetchProductos();
  }, [fechaFin]);

  // Advertencia al intentar salir con datos sin guardar
  useEffect(() => {
    const transferenciasSeleccionadas = transferenciasDisponibles.filter(t => t.seleccionada);
    const productosSeleccionados = productos.filter(p => p.seleccionado);
    const hasUnsavedData = fechaInicio || fechaFin ||
      transferenciasSeleccionadas.length > 0 ||
      productosSeleccionados.length > 0;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedData && paso === 1) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [fechaInicio, fechaFin, transferenciasDisponibles, productos, paso]);

  // Calcular límites de porcentaje cuando cambian transferencias o productos
  useEffect(() => {
    const calcularLimites = async () => {
      const transferenciasSeleccionadas = transferenciasDisponibles.filter(t => t.seleccionada);
      if (!fechaFin || transferenciasSeleccionadas.length === 0 || productos.length === 0) {
        setLimitesPorcentaje({});
        return;
      }

      const totalTransf = transferenciasSeleccionadas.reduce(
        (sum, t) => sum + parseFloat(t.monto),
        0
      );

      const nuevosLimites: Record<number, number> = {};

      // Calcular límites en paralelo para todos los productos
      await Promise.all(
        productos.map(async (prod) => {
          try {
            const response = await fetch("/api/ventas/porcentaje-maximo", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productoId: prod.productoId,
                fechaFin,
                totalTransferencias: totalTransf,
              }),
            });
            const data = await response.json();
            nuevosLimites[prod.productoId] = data.porcentajeMaximo;
          } catch (error) {
            console.error(`Error calculando límite para producto ${prod.productoId}:`, error);
            nuevosLimites[prod.productoId] = 100; // Por defecto 100% si hay error
          }
        })
      );

      setLimitesPorcentaje(nuevosLimites);
    };

    calcularLimites();
  }, [fechaFin, transferenciasDisponibles, productos.length]);

  // Buscar transferencias disponibles en el rango de fechas
  const buscarTransferencias = useCallback(async () => {
    if (!fechaInicio || !fechaFin) {
      setTransferenciasDisponibles([]);
      return;
    }

    setCargandoTransferencias(true);
    try {
      const params = new URLSearchParams({
        fechaDesde: fechaInicio,
        fechaHasta: fechaFin,
        disponibles: "true",
        limit: "1000",
      });

      const response = await fetch(`/api/transferencias?${params}`);
      const data = await response.json();

      setTransferenciasDisponibles(
        data.data.map((t: { id: number; fecha: string; monto: string }) => ({
          id: t.id,
          fecha: t.fecha,
          monto: t.monto,
          seleccionada: true, // Por defecto seleccionar todas
        }))
      );
    } catch (error) {
      console.error("Error al buscar transferencias:", error);
      showAlert({
        type: "error",
        title: "Error",
        message: "Error al buscar transferencias disponibles",
      });
    } finally {
      setCargandoTransferencias(false);
    }
  }, [fechaInicio, fechaFin, showAlert]);

  // Toggle selección de transferencia
  const toggleTransferencia = (id: number) => {
    setTransferenciasDisponibles(
      transferenciasDisponibles.map((t) =>
        t.id === id ? { ...t, seleccionada: !t.seleccionada } : t
      )
    );
  };

  // Seleccionar/deseleccionar todas
  const toggleTodasTransferencias = (seleccionar: boolean) => {
    setTransferenciasDisponibles(
      transferenciasDisponibles.map((t) => ({ ...t, seleccionada: seleccionar }))
    );
  };

  // Toggle producto seleccionado
  const toggleProducto = (productoId: number) => {
    setProductos(
      productos.map((p) =>
        p.productoId === productoId
          ? { ...p, seleccionado: !p.seleccionado }
          : p
      )
    );
  };

  // Actualizar porcentaje de producto
  const actualizarPorcentaje = (productoId: number, porcentaje: number) => {
    setProductos(
      productos.map((p) =>
        p.productoId === productoId ? { ...p, porcentaje } : p
      )
    );
  };

  // Validar porcentaje al perder foco del campo
  const validarPorcentajeOnBlur = (productoId: number) => {
    const producto = productos.find((p) => p.productoId === productoId);
    if (!producto || !producto.seleccionado) return;

    const limite = limitesPorcentaje[productoId] ?? 100;

    if (producto.porcentaje > limite) {
      setProductoExcedido({
        nombre: producto.nombre,
        porcentajeIngresado: producto.porcentaje,
        porcentajeMaximo: limite,
      });
      setMostrarModalLimite(true);

      // Ajustar automáticamente al máximo
      actualizarPorcentaje(productoId, limite);
    }
  };

  // Ejecutar el cálculo de distribución (con o sin reasignación)
  const ejecutarCalculoDistribucion = async (
    transferenciasParaCalculo: { fecha: string; monto: number }[],
    productosParaCalculo: { productoId: number; porcentaje: number }[],
    permitirReasignacionFiscal: boolean = false
  ) => {
    const response = await fetch("/api/ventas/calcular", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fechaInicio,
        fechaFin,
        transferencias: transferenciasParaCalculo,
        productos: productosParaCalculo,
        modoDistribucion,
        permitirReasignacionFiscal,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Error al calcular distribución");
    }

    return response.json();
  };

  // Continuar con reasignación automática de fiscales
  const continuarConReasignacion = async () => {
    if (!datosParaCalculo) return;

    setMostrarModalConflictos(false);
    setLoading(true);

    try {
      const data = await ejecutarCalculoDistribucion(
        datosParaCalculo.transferencias,
        datosParaCalculo.productos,
        true // permitirReasignacionFiscal = true
      );
      setPreview(data);
      setPaso(2);
    } catch (error) {
      console.error("Error:", error);
      showAlert({
        type: "error",
        title: "Error",
        message: error instanceof Error ? error.message : "Error al calcular distribución",
      });
    } finally {
      setLoading(false);
      setDatosParaCalculo(null);
    }
  };

  // Calcular distribución (ir a paso 2)
  const calcularDistribucion = async () => {
    // Validaciones
    if (!fechaInicio || !fechaFin) {
      showAlert({
        type: "warning",
        title: "Período incompleto",
        message: "Debe seleccionar el período de ventas",
      });
      return;
    }

    const transferenciasSeleccionadas = transferenciasDisponibles.filter(
      (t) => t.seleccionada
    );
    if (transferenciasSeleccionadas.length === 0) {
      showAlert({
        type: "warning",
        title: "Sin transferencias",
        message: "Debe seleccionar al menos una transferencia",
      });
      return;
    }

    const productosSeleccionados = productos.filter((p) => p.seleccionado);
    if (productosSeleccionados.length === 0) {
      showAlert({
        type: "warning",
        title: "Sin productos",
        message: "Debe seleccionar al menos un producto",
      });
      return;
    }

    // Si es modo manual, validar que los porcentajes sumen 100
    if (modoDistribucion === "MANUAL") {
      const totalPorcentaje = productosSeleccionados.reduce(
        (sum, p) => sum + p.porcentaje,
        0
      );
      if (Math.abs(totalPorcentaje - 100) > 0.01) {
        showAlert({
          type: "warning",
          title: "Porcentajes inválidos",
          message: `Los porcentajes deben sumar 100%. Actualmente suman ${totalPorcentaje.toFixed(2)}%`,
        });
        return;
      }
    }

    setLoading(true);
    try {
      // Convertir transferencias seleccionadas al formato esperado
      const transferenciasParaCalculo = transferenciasSeleccionadas.map((t) => ({
        fecha: t.fecha,
        monto: parseFloat(t.monto),
      }));

      // Calcular total de transferencias
      const totalTransf = transferenciasParaCalculo.reduce((sum, t) => sum + t.monto, 0);

      const productosParaCalculo = productosSeleccionados.map((p) => ({
        productoId: p.productoId,
        porcentaje: p.porcentaje,
      }));

      // PASO 1: Validar stock ANTES de calcular distribución
      const validacionResponse = await fetch("/api/ventas/validar-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fechaFin,
          totalTransferencias: totalTransf,
          productos: productosParaCalculo,
        }),
      });

      const validacion = await validacionResponse.json();

      // Si la validación de stock falla, mostrar errores y NO continuar
      if (!validacion.valido) {
        showAlert({
          type: "error",
          title: "Stock o liquidez insuficiente",
          message: validacion.errores.join("\n"),
        });
        setLoading(false);
        return;
      }

      // PASO 2: Validar fechas (transferencias vs fecha de importación)
      const validacionFechasResponse = await fetch("/api/ventas/validar-fechas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fechaFin,
          transferencias: transferenciasParaCalculo,
          productos: productosParaCalculo,
        }),
      });

      const validacionFechas = await validacionFechasResponse.json();

      // Si hay conflictos de fechas, verificar si algún producto puede cubrir
      if (!validacionFechas.valido && validacionFechas.conflictos?.length > 0) {
        // Verificar si hay al menos un producto disponible para cada transferencia
        const todasTransferenciasTienenProducto = validacionFechas.conflictos.every(
          (conflicto: ConflictoFechas) => {
            const productosExcluidosIds = conflicto.productosExcluidos.map(
              (p: { productoId: number }) => p.productoId
            );
            // Ver si hay productos que NO están excluidos
            const productosDisponibles = productosParaCalculo.filter(
              (p) => !productosExcluidosIds.includes(p.productoId)
            );
            return productosDisponibles.length > 0;
          }
        );

        if (!todasTransferenciasTienenProducto) {
          // Ningún producto puede cubrir alguna transferencia - mostrar error
          showAlert({
            type: "error",
            title: "Sin productos disponibles",
            message:
              "Algunas transferencias no tienen productos disponibles. Verifique las fechas de importación de los productos seleccionados.",
          });
          setLoading(false);
          return;
        }

        // Si hay productos disponibles, continuar con reasignación automática
        // (cada producto venderá en sus propios días válidos)
      }

      // PASO 3: Calcular distribución
      // Usar reasignación automática si hay conflictos de fechas pero productos disponibles
      const usarReasignacion = !validacionFechas.valido && validacionFechas.conflictos?.length > 0;
      const data = await ejecutarCalculoDistribucion(
        transferenciasParaCalculo,
        productosParaCalculo,
        usarReasignacion
      );
      setPreview(data);
      setPaso(2);
    } catch (error) {
      console.error("Error:", error);
      showAlert({
        type: "error",
        title: "Error de conexión",
        message: error instanceof Error ? error.message : "Error al calcular distribución",
      });
    } finally {
      setLoading(false);
    }
  };

  // Guardar venta
  const guardarVenta = async () => {
    if (!preview) return;

    // Obtener IDs de las transferencias seleccionadas
    const transferenciaIds = transferenciasDisponibles
      .filter((t) => t.seleccionada)
      .map((t) => t.id);

    setGuardando(true);
    try {
      const response = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fechaInicio,
          fechaFin,
          totalTransferencias: preview.totalTransferencias,
          totalUnidades: preview.totalUnidades,
          totalCUP: preview.totalCUP,
          modoDistribucion,
          observaciones: observaciones || null,
          transferenciaIds, // Enviar IDs en lugar de objetos
          lineas: preview.lineasVenta,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        showAlert({
          type: "error",
          title: "Error",
          message: error.error || "Error al guardar venta",
        });
        return;
      }

      const data = await response.json();
      router.push(`/ventas/${data.id}`);
    } catch (error) {
      console.error("Error:", error);
      showAlert({
        type: "error",
        title: "Error de conexión",
        message: "Error al guardar venta",
      });
    } finally {
      setGuardando(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CU", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC", // Evitar conversión de zona horaria
    });
  };

  // Calcular total de transferencias seleccionadas
  const transferenciasSeleccionadas = transferenciasDisponibles.filter(
    (t) => t.seleccionada
  );
  const totalTransferencias = transferenciasSeleccionadas.reduce(
    (sum, t) => sum + parseFloat(t.monto),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/ventas"
          className="p-2 hover:bg-muted/20 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 text-muted" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nueva Venta</h1>
          <p className="text-sm text-muted">
            {paso === 1
              ? "Paso 1: Configuración del período y productos"
              : "Paso 2: Preview y confirmación"}
          </p>
        </div>
      </div>

      {/* Indicador de pasos */}
      <div className="flex items-center gap-4">
        <div
          className={`flex items-center gap-2 ${
            paso === 1 ? "text-primary" : "text-muted"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              paso === 1
                ? "bg-primary text-primary-foreground"
                : "bg-muted/20 text-muted"
            }`}
          >
            1
          </div>
          <span className="hidden sm:inline">Configuración</span>
        </div>
        <div className="flex-1 h-px bg-border" />
        <div
          className={`flex items-center gap-2 ${
            paso === 2 ? "text-primary" : "text-muted"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              paso === 2
                ? "bg-primary text-primary-foreground"
                : "bg-muted/20 text-muted"
            }`}
          >
            2
          </div>
          <span className="hidden sm:inline">Preview</span>
        </div>
      </div>

      {/* Modal de Conflictos de Fechas */}
      <Modal
        isOpen={mostrarModalConflictos}
        onClose={() => {
          setMostrarModalConflictos(false);
          setConflictosFechas([]);
          setDatosParaCalculo(null);
        }}
        title="Conflicto de Fechas"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <ExclamationTriangleIcon className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Algunas transferencias tienen fechas anteriores a la importación del producto
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Las ventas fiscales solo pueden asignarse a partir de la fecha de importación del producto.
              </p>
            </div>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {conflictosFechas.map((conflicto, index) => (
              <div key={index} className="p-3 bg-muted/10 rounded-lg border border-border">
                <div className="font-medium mb-2">
                  Transferencia del {formatDate(conflicto.transferencia.fecha)} ({formatCurrency(conflicto.transferencia.monto)} CUP)
                </div>
                <ul className="text-sm text-muted space-y-1">
                  {conflicto.productosExcluidos.map((prod, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-error">•</span>
                      <span>
                        <strong>{prod.nombre}</strong>: importación del {formatDate(prod.fechaImportacion)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted mb-4">
              ¿Qué desea hacer?
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setMostrarModalConflictos(false);
                  setConflictosFechas([]);
                  setDatosParaCalculo(null);
                }}
                className="flex-1"
              >
                Ajustar manualmente
              </Button>
              <Button
                onClick={continuarConReasignacion}
                className="flex-1"
              >
                Reasignar automáticamente
              </Button>
            </div>
            <p className="text-xs text-muted mt-3">
              <strong>Reasignar automáticamente:</strong> Las ventas fiscales se asignarán a los primeros días hábiles disponibles del producto (desde su fecha de importación).
            </p>
          </div>
        </div>
      </Modal>

      {/* Modal de Límite de Porcentaje Excedido */}
      <Modal
        isOpen={mostrarModalLimite}
        onClose={() => {
          setMostrarModalLimite(false);
          setProductoExcedido(null);
        }}
        title="Porcentaje Ajustado"
        size="sm"
      >
        {productoExcedido && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <ExclamationTriangleIcon className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Stock insuficiente
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  <strong>{productoExcedido.nombre}</strong> no tiene suficiente
                  stock para cubrir el{" "}
                  {productoExcedido.porcentajeIngresado.toFixed(2)}% de las
                  transferencias seleccionadas.
                </p>
              </div>
            </div>

            <div className="text-center py-4">
              <p className="text-sm text-muted mb-2">
                Porcentaje máximo disponible:
              </p>
              <p className="text-3xl font-bold text-primary">
                {productoExcedido.porcentajeMaximo.toFixed(2)}%
              </p>
              <p className="text-xs text-muted mt-2">
                Se ha ajustado automáticamente
              </p>
            </div>

            <Button
              onClick={() => {
                setMostrarModalLimite(false);
                setProductoExcedido(null);
              }}
              className="w-full"
            >
              Entendido
            </Button>
          </div>
        )}
      </Modal>

      {paso === 1 ? (
        /* PASO 1: Configuración */
        <div className="space-y-6">
          {/* Período */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Período de Ventas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Fecha Inicio
                </label>
                <Input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Fecha Fin
                </label>
                <Input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Transferencias */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                Transferencias Bancarias
              </h2>
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted">
                  {transferenciasSeleccionadas.length} seleccionadas •{" "}
                  <span className="font-medium text-foreground">
                    {formatCurrency(totalTransferencias)} CUP
                  </span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={buscarTransferencias}
                  disabled={!fechaInicio || !fechaFin || cargandoTransferencias}
                >
                  <MagnifyingGlassIcon className="h-4 w-4" />
                  {cargandoTransferencias ? "Buscando..." : "Buscar"}
                </Button>
              </div>
            </div>

            {!fechaInicio || !fechaFin ? (
              <p className="text-center text-muted py-4">
                Seleccione el período para buscar transferencias disponibles
              </p>
            ) : transferenciasDisponibles.length === 0 && !cargandoTransferencias ? (
              <div className="text-center py-4">
                <p className="text-muted mb-2">
                  No se encontraron transferencias en el período seleccionado
                </p>
                <Link
                  href="/estado-cuenta"
                  className="text-primary hover:underline text-sm"
                >
                  Ir a Estado de Cuenta para agregar transferencias
                </Link>
              </div>
            ) : cargandoTransferencias ? (
              <div className="flex items-center justify-center py-8">
                <ArrowPathIcon className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Controles de selección */}
                <div className="flex items-center gap-4 mb-3 text-sm">
                  <button
                    type="button"
                    onClick={() => toggleTodasTransferencias(true)}
                    className="text-primary hover:underline"
                  >
                    Seleccionar todas
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleTodasTransferencias(false)}
                    className="text-muted hover:text-foreground"
                  >
                    Deseleccionar todas
                  </button>
                </div>

                {/* Lista de transferencias */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {transferenciasDisponibles.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => toggleTransferencia(t.id)}
                      className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-colors ${
                        t.seleccionada
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/10"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          t.seleccionada
                            ? "border-primary bg-primary"
                            : "border-muted"
                        }`}
                      >
                        {t.seleccionada && (
                          <CheckCircleIcon className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <span className="font-medium">{formatDate(t.fecha)}</span>
                      </div>
                      <div className="font-mono font-medium text-primary">
                        {formatCurrency(parseFloat(t.monto))} CUP
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Productos */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Productos a Vender</h2>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted">Modo:</label>
                <select
                  value={modoDistribucion}
                  onChange={(e) =>
                    setModoDistribucion(e.target.value as "MANUAL" | "AUTO")
                  }
                  className="input py-1 px-2 text-sm"
                >
                  <option value="MANUAL">Manual</option>
                  <option value="AUTO">Automático (por stock)</option>
                </select>
              </div>
            </div>

            {!fechaFin ? (
              <p className="text-muted text-center py-4">
                Seleccione la fecha fin para ver productos disponibles
              </p>
            ) : cargandoProductos ? (
              <div className="flex items-center justify-center py-8">
                <ArrowPathIcon className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : productos.length === 0 ? (
              <div className="text-center py-4 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="font-medium">No hay productos con stock disponible para esta fecha</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  No existen importaciones antes del {formatDate(fechaFin)}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {productos.map((p) => (
                  <div
                    key={p.productoId}
                    className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                      p.seleccionado
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={p.seleccionado}
                      onChange={() => toggleProducto(p.productoId)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{p.nombre}</div>
                      <div className="text-sm text-muted">
                        Stock: {p.stock.toLocaleString()} uds
                        {limitesPorcentaje[p.productoId] !== undefined && (
                          <span className="ml-2 text-xs text-primary">
                            (máx: {limitesPorcentaje[p.productoId].toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    </div>
                    {modoDistribucion === "MANUAL" && p.seleccionado && (
                      <div className="w-24">
                        <Input
                          type="number"
                          placeholder="%"
                          value={p.porcentaje || ""}
                          onChange={(e) =>
                            actualizarPorcentaje(
                              p.productoId,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          onBlur={() => validarPorcentajeOnBlur(p.productoId)}
                          min={0}
                          max={limitesPorcentaje[p.productoId] ?? 100}
                        />
                      </div>
                    )}
                  </div>
                ))}

                {modoDistribucion === "MANUAL" && (
                  <div className="text-right text-sm">
                    Total:{" "}
                    <span
                      className={
                        Math.abs(
                          productos
                            .filter((p) => p.seleccionado)
                            .reduce((sum, p) => sum + p.porcentaje, 0) - 100
                        ) < 0.01
                          ? "text-success"
                          : "text-error"
                      }
                    >
                      {productos
                        .filter((p) => p.seleccionado)
                        .reduce((sum, p) => sum + p.porcentaje, 0)
                        .toFixed(2)}
                      %
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Observaciones</h2>
            <textarea
              className="input w-full h-20"
              placeholder="Observaciones opcionales..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-3">
            <Link href="/ventas">
              <Button variant="secondary">Cancelar</Button>
            </Link>
            <Button onClick={calcularDistribucion} disabled={loading}>
              {loading ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  Calculando...
                </>
              ) : (
                <>
                  <CalculatorIcon className="h-4 w-4" />
                  Calcular Distribución
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        /* PASO 2: Preview */
        <div className="space-y-6">
          {preview && (
            <>
              {/* Alertas de stock */}
              {!preview.validacionStock.valido && (
                <div className="card bg-error/10 border-error">
                  <h3 className="font-semibold text-error mb-2">
                    Errores de Stock
                  </h3>
                  <ul className="list-disc list-inside text-sm text-error">
                    {preview.validacionStock.errores.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Resumen */}
              <div className="card">
                <h2 className="text-lg font-semibold mb-4">Resumen</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted/10 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(preview.totalTransferencias)}
                    </div>
                    <div className="text-sm text-muted">
                      Transferencias CUP
                    </div>
                  </div>
                  <div className="text-center p-3 bg-muted/10 rounded-lg">
                    <div className="text-2xl font-bold text-foreground">
                      {preview.totalUnidades.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted">Unidades Totales</div>
                  </div>
                  <div className="text-center p-3 bg-muted/10 rounded-lg">
                    <div className="text-2xl font-bold text-success">
                      {formatCurrency(preview.totalCUP)}
                    </div>
                    <div className="text-sm text-muted">Total Ventas CUP</div>
                  </div>
                  <div className="text-center p-3 bg-muted/10 rounded-lg">
                    <div className="text-2xl font-bold text-foreground">
                      {preview.lineasVenta.length}
                    </div>
                    <div className="text-sm text-muted">Líneas de Venta</div>
                  </div>
                </div>
              </div>

              {/* Totales por producto */}
              <div className="card">
                <h2 className="text-lg font-semibold mb-4">
                  Totales por Producto
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2">Producto</th>
                        <th className="text-right py-2">USD</th>
                        <th className="text-right py-2">Fiscal</th>
                        <th className="text-right py-2">Efectivo</th>
                        <th className="text-right py-2 font-bold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(preview.totalesPorProducto).map(
                        ([id, prod]) => (
                          <tr key={id} className="border-b border-border/50">
                            <td className="py-2 font-medium">{prod.nombre}</td>
                            <td className="text-right py-2">
                              <div>{prod.usd.cantidad.toLocaleString()} uds</div>
                              <div className="text-xs text-muted">
                                {formatCurrency(prod.usd.subtotal)} CUP
                              </div>
                            </td>
                            <td className="text-right py-2">
                              <div>
                                {prod.fiscal.cantidad.toLocaleString()} uds
                              </div>
                              <div className="text-xs text-muted">
                                {formatCurrency(prod.fiscal.subtotal)} CUP
                              </div>
                            </td>
                            <td className="text-right py-2">
                              <div>
                                {prod.efectivo.cantidad.toLocaleString()} uds
                              </div>
                              <div className="text-xs text-muted">
                                {formatCurrency(prod.efectivo.subtotal)} CUP
                              </div>
                            </td>
                            <td className="text-right py-2 font-bold">
                              <div>
                                {prod.total.cantidad.toLocaleString()} uds
                              </div>
                              <div className="text-xs text-success">
                                {formatCurrency(prod.total.subtotal)} CUP
                              </div>
                            </td>
                          </tr>
                        )
                      )}
                      <tr className="font-bold bg-muted/10">
                        <td className="py-2">TOTAL</td>
                        <td className="text-right py-2">
                          {preview.totalesGenerales.usd.cantidad.toLocaleString()}{" "}
                          uds
                        </td>
                        <td className="text-right py-2">
                          {preview.totalesGenerales.fiscal.cantidad.toLocaleString()}{" "}
                          uds
                        </td>
                        <td className="text-right py-2">
                          {preview.totalesGenerales.efectivo.cantidad.toLocaleString()}{" "}
                          uds
                        </td>
                        <td className="text-right py-2 text-success">
                          {preview.totalesGenerales.total.cantidad.toLocaleString()}{" "}
                          uds
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Líneas de venta por día */}
              <div className="card">
                <h2 className="text-lg font-semibold mb-4">
                  Ventas por Día (Preview)
                </h2>
                <div className="overflow-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-white dark:bg-gray-900">
                      <tr className="border-b border-border">
                        <th className="text-left py-2 bg-white dark:bg-gray-900">Fecha</th>
                        <th className="text-left py-2 bg-white dark:bg-gray-900">Producto</th>
                        <th className="text-left py-2 bg-white dark:bg-gray-900">Canal</th>
                        <th className="text-right py-2 bg-white dark:bg-gray-900">Cantidad</th>
                        <th className="text-right py-2 bg-white dark:bg-gray-900">Precio</th>
                        <th className="text-right py-2 bg-white dark:bg-gray-900">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.lineasVenta.slice(0, 50).map((linea, index) => (
                        <tr key={index} className="border-b border-border/50">
                          <td className="py-1">{formatDate(linea.fecha)}</td>
                          <td className="py-1">{linea.nombreProducto}</td>
                          <td className="py-1">
                            <span
                              className={`badge ${
                                linea.canal === "USD"
                                  ? "badge-primary"
                                  : linea.canal === "FISCAL"
                                  ? "badge-success"
                                  : "badge-warning"
                              }`}
                            >
                              {linea.canal}
                            </span>
                          </td>
                          <td className="text-right py-1">
                            {linea.cantidad.toLocaleString()}
                          </td>
                          <td className="text-right py-1">
                            {formatCurrency(linea.precioUnitario)}
                          </td>
                          <td className="text-right py-1 font-medium">
                            {formatCurrency(linea.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="sticky bottom-0 z-10 bg-white dark:bg-gray-900">
                      <tr className="font-bold border-t border-border">
                        <td colSpan={5} className="py-2 text-right bg-white dark:bg-gray-900">TOTAL:</td>
                        <td className="py-2 text-right text-success bg-white dark:bg-gray-900">{formatCurrency(preview.totalCUP)}</td>
                      </tr>
                    </tfoot>
                  </table>
                  {preview.lineasVenta.length > 50 && (
                    <p className="text-center text-sm text-muted py-2">
                      Mostrando 50 de {preview.lineasVenta.length} líneas...
                    </p>
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex justify-between">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setPaso(1);
                    setPreview(null);
                  }}
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  Volver
                </Button>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={calcularDistribucion}
                    disabled={loading}
                  >
                    <ArrowPathIcon
                      className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                    />
                    Recalcular
                  </Button>
                  <Button
                    onClick={guardarVenta}
                    disabled={
                      guardando || !preview.validacionStock.valido
                    }
                  >
                    {guardando ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <CheckIcon className="h-4 w-4" />
                        Guardar Venta
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

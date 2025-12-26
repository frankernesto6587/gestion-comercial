"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  PlusIcon,
  TrashIcon,
  CalculatorIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { Button, Input, Select, SelectOption, TooltipFormula } from "@/components/ui";
import { calcularPrecios, ResultadoCalculo } from "@/lib/calculations";
import { useAlert } from "@/contexts/AlertContext";

// ============================================
// INTERFACES
// ============================================

interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
}

interface Moneda {
  id: number;
  codigo: string;
  nombre: string;
  simbolo: string;
  tasaDefecto: number;
}

interface TipoGasto {
  id: number;
  nombre: string;
  descripcion: string | null;
}

interface Importadora {
  id: number;
  nombre: string;
}

interface Proveedor {
  id: number;
  nombre: string;
}

interface TasaCambioContenedor {
  monedaId: number;
  monedaCodigo: string;
  monedaNombre: string;
  tasaCambio: number;
}

interface GastoContenedor {
  tipoGastoId: number;
  tipoGastoNombre: string;
  monedaId: number;
  monedaCodigo: string;
  monto: number;
  descripcion: string;
}

interface ProductoParaAgregar {
  productoId: number;
  productoNombre: string;
  cantidadUnidades: number;
  precioUnitarioUSD: number; // Precio por unidad (input del usuario)
  importeUSD: number; // Calculado: precioUnitarioUSD * cantidadUnidades
  porcentajeMerma: number;
  margenUtilidad: number;
  mediaPrecioFiscal: number;
  mediaPrecioFiscalEfectivo: number;
  ventaRealEstimada: number | null; // Dato de entrada del usuario
  // Porcentaje de la factura (para prorrateo)
  porcentajeFactura?: number;
  // Gastos prorrateados
  gastosPorrateadosCUP?: number;
  // Objeto con todos los cálculos
  calculos?: {
    // Costos
    costoUnitarioUSD: number;
    costoUnitarioCUP: number;
    costoBrutoUnitario: number;
    // Cantidades
    cantidadVendible: number;
    cantidadMerma: number;
    cantidadVentaUSD: number;
    cantidadVentaFiscal: number;
    cantidadVentaEfectivo: number;
    // Precios
    precioVentaUSD: number;
    precioVentaCUP: number;
    precioFiscalCUP: number;
    precioEfectivoCUP: number;
    // Ventas por canal
    ventaUSDEnCUP: number;
    ventaFiscalCUP: number;
    ventaEfectivoCUP: number;
    ventaTotalFiscal: number;
    // Costos e impuestos
    costoProductosCUP: number;
    otrosGastosPorciento: number;
    costoTotalBruto: number;
    aporte11Porciento: number;
    impuesto35Utilidad: number;
    totalImpuestos: number;
    cargaTributaria: number;
    // Utilidad
    utilidadEstimada: number;
    porcentajeUtilidadEstimada: number;
    utilidadBrutaReal: number;
    // Punto de equilibrio
    unidadesParaRecuperar: number;
    porcentajeUnidadesRecuperar: number;
    // Otros
    inversionTotal: number;
    ventasTotalesUSD: number;
    ventasTotalesCUP: number;
    utilidadBrutaUSD: number;
    utilidadBrutaCUP: number;
    porcentajeUtilidad: number;
  };
}

// ============================================
// VALORES POR DEFECTO
// ============================================

const PORCENTAJES_DEFAULTS = {
  porcentajeVentaUSD: 91,
  porcentajeMerma: 2,
  porcentajeMargenUtilidad: 4,
  porcentajeAporteMasMargen: 15,
  porcentajeMargenComercial: 85,
  porcentajeVentaFiscal: 5,
  porcentajeVentaEfectivo: 4,
  porcentajeOtrosGastos: 10, // % Otros Gastos para costos e impuestos
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function NuevaImportacionPage() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);

  // Datos disponibles (de la BD)
  const [productosDisponibles, setProductosDisponibles] = useState<Producto[]>([]);
  const [monedasDisponibles, setMonedasDisponibles] = useState<Moneda[]>([]);
  const [tiposGastoDisponibles, setTiposGastoDisponibles] = useState<TipoGasto[]>([]);
  const [importadorasDisponibles, setImportadorasDisponibles] = useState<Importadora[]>([]);
  const [proveedoresDisponibles, setProveedoresDisponibles] = useState<Proveedor[]>([]);

  // Secciones colapsables
  const [mostrarMonedas, setMostrarMonedas] = useState(true);
  const [mostrarPorcentajes, setMostrarPorcentajes] = useState(false);
  const [mostrarGastos, setMostrarGastos] = useState(true);

  // Sección 1: Datos del Contenedor
  const [importacion, setImportacion] = useState({
    fecha: new Date().toISOString().split("T")[0],
    numeroContenedor: "",
    importadoraId: 0,
    proveedorId: 0,
    observaciones: "",
  });

  // Sección 2: Monedas y Tasas de Cambio
  const [tasasCambio, setTasasCambio] = useState<TasaCambioContenedor[]>([]);

  // Sección 3: Porcentajes de Cálculo
  const [porcentajes, setPorcentajes] = useState(PORCENTAJES_DEFAULTS);

  // Sección 4: Gastos Asociados
  const [gastos, setGastos] = useState<GastoContenedor[]>([]);
  const [gastoActual, setGastoActual] = useState({
    tipoGastoId: 0,
    monedaId: 0,
    monto: 0,
    descripcion: "",
  });

  // Sección 5: Productos
  const [productosAgregados, setProductosAgregados] = useState<ProductoParaAgregar[]>([]);
  const [productoActual, setProductoActual] = useState<ProductoParaAgregar>({
    productoId: 0,
    productoNombre: "",
    cantidadUnidades: 0,
    precioUnitarioUSD: 0, // Precio por unidad
    importeUSD: 0, // Se calcula automáticamente
    porcentajeMerma: 2,
    margenUtilidad: 15,
    mediaPrecioFiscal: 173,
    mediaPrecioFiscalEfectivo: 173,
    ventaRealEstimada: null,
  });
  // Rastrear cuál campo fue editado: 'precio' o 'importe'
  const [campoEditado, setCampoEditado] = useState<'precio' | 'importe'>('precio');
  const [productoSeleccionado, setProductoSeleccionado] = useState<SelectOption | null>(null);

  // ============================================
  // CARGAR DATOS
  // ============================================

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productosRes, monedasRes, tiposGastoRes, importadorasRes, proveedoresRes] = await Promise.all([
          fetch("/api/productos?limit=100&activo=true"),
          fetch("/api/monedas?activo=true"),
          fetch("/api/tipos-gasto?activo=true"),
          fetch("/api/importadoras?activo=true"),
          fetch("/api/proveedores?activo=true"),
        ]);

        const [productosData, monedasData, tiposGastoData, importadorasData, proveedoresData] = await Promise.all([
          productosRes.json(),
          monedasRes.json(),
          tiposGastoRes.json(),
          importadorasRes.json(),
          proveedoresRes.json(),
        ]);

        setProductosDisponibles(productosData.data || []);
        setMonedasDisponibles(monedasData || []);
        setTiposGastoDisponibles(tiposGastoData || []);
        setImportadorasDisponibles(importadorasData || []);
        setProveedoresDisponibles(proveedoresData || []);

        // Inicializar tasas de cambio con USD y CUP por defecto
        const monedaUSD = (monedasData || []).find((m: Moneda) => m.codigo === "USD");
        if (monedaUSD) {
          setTasasCambio([
            {
              monedaId: monedaUSD.id,
              monedaCodigo: monedaUSD.codigo,
              monedaNombre: monedaUSD.nombre,
              tasaCambio: Number(monedaUSD.tasaDefecto),
            },
          ]);
        }
      } catch (error) {
        console.error("Error al cargar datos:", error);
      }
    };
    fetchData();
  }, []);

  // ============================================
  // CÁLCULOS EN TIEMPO REAL
  // ============================================

  // Obtener tasa USD
  const tasaUSD = useMemo(() => {
    const tasa = tasasCambio.find((t) => t.monedaCodigo === "USD");
    return tasa?.tasaCambio || 320;
  }, [tasasCambio]);

  // Suma de porcentajes de venta (debe ser 100%)
  const sumaVentas = useMemo(() => {
    return porcentajes.porcentajeVentaUSD +
           porcentajes.porcentajeVentaFiscal +
           porcentajes.porcentajeVentaEfectivo;
  }, [porcentajes.porcentajeVentaUSD, porcentajes.porcentajeVentaFiscal, porcentajes.porcentajeVentaEfectivo]);

  const ventasSuman100 = Math.abs(sumaVentas - 100) < 0.01;

  // Calcular total de gastos en CUP
  const totalGastosCUP = useMemo(() => {
    let total = 0;
    for (const gasto of gastos) {
      const tasa = tasasCambio.find((t) => t.monedaId === gasto.monedaId);
      const tasaMoneda = tasa?.tasaCambio || 1;
      total += gasto.monto * tasaMoneda;
    }
    return total;
  }, [gastos, tasasCambio]);

  // Total de unidades (solo para info)
  const totalUnidades = useMemo(
    () => productosAgregados.reduce((sum, p) => sum + p.cantidadUnidades, 0),
    [productosAgregados]
  );

  // Total de importe USD para prorrateo por inversión (no por cantidad)
  const totalImporteUSD = useMemo(
    () => productosAgregados.reduce((sum, p) => sum + p.importeUSD, 0),
    [productosAgregados]
  );

  // Calcular precios de un producto usando la función de calculations.ts
  const calcularPreciosProducto = (prod: ProductoParaAgregar): ProductoParaAgregar => {
    if (prod.cantidadUnidades <= 0 || prod.importeUSD <= 0) return prod;

    // Prorratear gastos por inversión (% que representa del total de la factura)
    const proporcion = totalImporteUSD > 0 ? prod.importeUSD / totalImporteUSD : 0;
    const porcentajeFactura = proporcion * 100;
    const gastosPorrateadosCUP = totalGastosCUP * proporcion;

    // Usar la función de cálculo centralizada
    const resultado = calcularPrecios({
      cantidadUnidades: prod.cantidadUnidades,
      importeUSD: prod.importeUSD,
      gastosPorrateadosCUP,
      porcentajeMerma: prod.porcentajeMerma,
      margenUtilidad: prod.margenUtilidad,
      tasaCambio: tasaUSD,
      // Parámetros de Leyenda desde el contenedor
      porcentajeVentaUSD: porcentajes.porcentajeVentaUSD,
      porcentajeVentaFiscal: porcentajes.porcentajeVentaFiscal,
      porcentajeVentaEfectivo: porcentajes.porcentajeVentaEfectivo,
      porcentajeMargenComercial: porcentajes.porcentajeMargenComercial,
      // Porcentaje de otros gastos
      porcentajeOtrosGastos: porcentajes.porcentajeOtrosGastos,
      // Media de precios fiscales desde el producto
      mediaPrecioFiscal: prod.mediaPrecioFiscal,
      mediaPrecioFiscalEfectivo: prod.mediaPrecioFiscalEfectivo,
    });

    // Convertir Decimal a number para el objeto de cálculos
    return {
      ...prod,
      porcentajeFactura,
      gastosPorrateadosCUP,
      calculos: {
        // Costos
        costoUnitarioUSD: resultado.costoUnitarioUSD.toNumber(),
        costoUnitarioCUP: resultado.costoUnitarioCUP.toNumber(),
        costoBrutoUnitario: resultado.costoBrutoUnitario.toNumber(),
        // Cantidades
        cantidadVendible: resultado.cantidadVendible.toNumber(),
        cantidadMerma: resultado.cantidadMerma.toNumber(),
        cantidadVentaUSD: resultado.cantidadVentaUSD.toNumber(),
        cantidadVentaFiscal: resultado.cantidadVentaFiscal.toNumber(),
        cantidadVentaEfectivo: resultado.cantidadVentaEfectivo.toNumber(),
        // Precios
        precioVentaUSD: resultado.precioVentaUSD.toNumber(),
        precioVentaCUP: resultado.precioVentaCUP.toNumber(),
        precioFiscalCUP: resultado.precioFiscalCUP.toNumber(),
        precioEfectivoCUP: resultado.precioEfectivoCUP.toNumber(),
        // Ventas por canal
        ventaUSDEnCUP: resultado.ventaUSDEnCUP.toNumber(),
        ventaFiscalCUP: resultado.ventaFiscalCUP.toNumber(),
        ventaEfectivoCUP: resultado.ventaEfectivoCUP.toNumber(),
        ventaTotalFiscal: resultado.ventaTotalFiscal.toNumber(),
        // Costos e impuestos
        costoProductosCUP: resultado.costoProductosCUP.toNumber(),
        otrosGastosPorciento: resultado.otrosGastosPorciento.toNumber(),
        costoTotalBruto: resultado.costoTotalBruto.toNumber(),
        aporte11Porciento: resultado.aporte11Porciento.toNumber(),
        impuesto35Utilidad: resultado.impuesto35Utilidad.toNumber(),
        totalImpuestos: resultado.totalImpuestos.toNumber(),
        cargaTributaria: resultado.cargaTributaria.toNumber(),
        // Utilidad
        utilidadEstimada: resultado.utilidadEstimada.toNumber(),
        porcentajeUtilidadEstimada: resultado.porcentajeUtilidadEstimada.toNumber(),
        utilidadBrutaReal: resultado.utilidadBrutaReal.toNumber(),
        // Punto de equilibrio
        unidadesParaRecuperar: resultado.unidadesParaRecuperar.toNumber(),
        porcentajeUnidadesRecuperar: resultado.porcentajeUnidadesRecuperar.toNumber(),
        // Otros
        inversionTotal: resultado.inversionTotal.toNumber(),
        ventasTotalesUSD: resultado.ventasTotalesUSD.toNumber(),
        ventasTotalesCUP: resultado.ventasTotalesCUP.toNumber(),
        utilidadBrutaUSD: resultado.utilidadBrutaUSD.toNumber(),
        utilidadBrutaCUP: resultado.utilidadBrutaCUP.toNumber(),
        porcentajeUtilidad: resultado.porcentajeUtilidad.toNumber(),
      },
    };
  };

  // Recalcular todos los productos cuando cambian gastos, tasas o porcentajes
  const productosConCalculos = useMemo(
    () => productosAgregados.map(calcularPreciosProducto),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [productosAgregados, totalGastosCUP, tasaUSD, totalImporteUSD, porcentajes]
  );

  // Totales consolidados del contenedor
  const totalesContenedor = useMemo(() => {
    if (productosConCalculos.length === 0) return null;

    const totales = productosConCalculos.reduce(
      (acc, p) => {
        if (!p.calculos) return acc;
        return {
          // Cantidades
          cantidadVendible: acc.cantidadVendible + p.calculos.cantidadVendible,
          cantidadMerma: acc.cantidadMerma + p.calculos.cantidadMerma,
          cantidadVentaUSD: acc.cantidadVentaUSD + p.calculos.cantidadVentaUSD,
          cantidadVentaFiscal: acc.cantidadVentaFiscal + p.calculos.cantidadVentaFiscal,
          cantidadVentaEfectivo: acc.cantidadVentaEfectivo + p.calculos.cantidadVentaEfectivo,
          // Ventas por canal
          ventaUSDEnCUP: acc.ventaUSDEnCUP + p.calculos.ventaUSDEnCUP,
          ventaFiscalCUP: acc.ventaFiscalCUP + p.calculos.ventaFiscalCUP,
          ventaEfectivoCUP: acc.ventaEfectivoCUP + p.calculos.ventaEfectivoCUP,
          ventaTotalFiscal: acc.ventaTotalFiscal + p.calculos.ventaTotalFiscal,
          // Costos
          costoProductosCUP: acc.costoProductosCUP + p.calculos.costoProductosCUP,
          otrosGastosPorciento: acc.otrosGastosPorciento + p.calculos.otrosGastosPorciento,
          costoTotalBruto: acc.costoTotalBruto + p.calculos.costoTotalBruto,
          // Impuestos
          aporte11Porciento: acc.aporte11Porciento + p.calculos.aporte11Porciento,
          impuesto35Utilidad: acc.impuesto35Utilidad + p.calculos.impuesto35Utilidad,
          totalImpuestos: acc.totalImpuestos + p.calculos.totalImpuestos,
          // Utilidad
          utilidadEstimada: acc.utilidadEstimada + p.calculos.utilidadEstimada,
          utilidadBrutaReal: acc.utilidadBrutaReal + p.calculos.utilidadBrutaReal,
          inversionTotal: acc.inversionTotal + p.calculos.inversionTotal,
        };
      },
      {
        cantidadVendible: 0, cantidadMerma: 0, cantidadVentaUSD: 0,
        cantidadVentaFiscal: 0, cantidadVentaEfectivo: 0,
        ventaUSDEnCUP: 0, ventaFiscalCUP: 0, ventaEfectivoCUP: 0, ventaTotalFiscal: 0,
        costoProductosCUP: 0, otrosGastosPorciento: 0, costoTotalBruto: 0,
        aporte11Porciento: 0, impuesto35Utilidad: 0, totalImpuestos: 0,
        utilidadEstimada: 0, utilidadBrutaReal: 0, inversionTotal: 0,
      }
    );

    // Calcular porcentajes consolidados
    const cargaTributaria = totales.ventaTotalFiscal > 0
      ? (totales.totalImpuestos / totales.ventaTotalFiscal) * 100
      : 0;
    const porcentajeUtilidadEstimada = totales.ventaTotalFiscal > 0
      ? (totales.utilidadEstimada / totales.ventaTotalFiscal) * 100
      : 0;

    return { ...totales, cargaTributaria, porcentajeUtilidadEstimada };
  }, [productosConCalculos]);

  // Total de venta real estimada (suma de productos que lo tengan)
  const totalVentaRealEstimada = useMemo(() => {
    return productosAgregados.reduce((sum, p) => sum + (p.ventaRealEstimada || 0), 0);
  }, [productosAgregados]);

  // Carga tributaria sobre venta real estimada
  const cargaSobreVentaReal = useMemo(() => {
    if (totalVentaRealEstimada <= 0 || !totalesContenedor) return 0;
    return (totalesContenedor.totalImpuestos / totalVentaRealEstimada) * 100;
  }, [totalVentaRealEstimada, totalesContenedor]);

  // ============================================
  // HANDLERS
  // ============================================

  // Agregar/modificar tasa de cambio
  const handleToggleMoneda = (moneda: Moneda) => {
    const existe = tasasCambio.find((t) => t.monedaId === moneda.id);
    if (existe) {
      // No permitir quitar CUP si hay gastos en esa moneda
      const tieneGastos = gastos.some((g) => g.monedaId === moneda.id);
      if (tieneGastos) {
        showAlert({
          type: "warning",
          title: "Moneda en uso",
          message: "No puede quitar esta moneda porque tiene gastos asociados",
        });
        return;
      }
      setTasasCambio(tasasCambio.filter((t) => t.monedaId !== moneda.id));
    } else {
      setTasasCambio([
        ...tasasCambio,
        {
          monedaId: moneda.id,
          monedaCodigo: moneda.codigo,
          monedaNombre: moneda.nombre,
          tasaCambio: Number(moneda.tasaDefecto),
        },
      ]);
    }
  };

  const handleTasaCambio = (monedaId: number, tasa: number) => {
    setTasasCambio(
      tasasCambio.map((t) => (t.monedaId === monedaId ? { ...t, tasaCambio: tasa } : t))
    );
  };

  // Agregar gasto
  const handleAgregarGasto = () => {
    if (!gastoActual.tipoGastoId || !gastoActual.monedaId || gastoActual.monto <= 0) {
      showAlert({
        type: "warning",
        title: "Campos incompletos",
        message: "Complete todos los campos del gasto",
      });
      return;
    }

    const tipoGasto = tiposGastoDisponibles.find((t) => t.id === gastoActual.tipoGastoId);
    const moneda = monedasDisponibles.find((m) => m.id === gastoActual.monedaId);

    if (!tipoGasto || !moneda) return;

    setGastos([
      ...gastos,
      {
        tipoGastoId: gastoActual.tipoGastoId,
        tipoGastoNombre: tipoGasto.nombre,
        monedaId: gastoActual.monedaId,
        monedaCodigo: moneda.codigo,
        monto: gastoActual.monto,
        descripcion: gastoActual.descripcion,
      },
    ]);

    setGastoActual({ tipoGastoId: 0, monedaId: 0, monto: 0, descripcion: "" });
  };

  const handleEliminarGasto = (index: number) => {
    setGastos(gastos.filter((_, i) => i !== index));
  };

  // Agregar producto
  const handleAgregarProducto = () => {
    if (!productoSeleccionado || productoActual.cantidadUnidades <= 0 || productoActual.precioUnitarioUSD <= 0) {
      showAlert({
        type: "warning",
        title: "Campos incompletos",
        message: "Complete todos los campos requeridos del producto",
      });
      return;
    }

    // Calcular importe total = precio unitario * cantidad
    const importeCalculado = productoActual.precioUnitarioUSD * productoActual.cantidadUnidades;

    const nuevoProducto: ProductoParaAgregar = {
      ...productoActual,
      productoId: Number(productoSeleccionado.value),
      productoNombre: productoSeleccionado.label,
      importeUSD: importeCalculado,
    };

    setProductosAgregados([...productosAgregados, nuevoProducto]);

    // Resetear formulario
    setProductoActual({
      productoId: 0,
      productoNombre: "",
      cantidadUnidades: 0,
      precioUnitarioUSD: 0,
      importeUSD: 0,
      porcentajeMerma: 2,
      margenUtilidad: 15,
      mediaPrecioFiscal: 173,
      mediaPrecioFiscalEfectivo: 173,
      ventaRealEstimada: null,
    });
    setProductoSeleccionado(null);
  };

  const handleEliminarProducto = (index: number) => {
    setProductosAgregados(productosAgregados.filter((_, i) => i !== index));
  };

  // Guardar importación
  const handleGuardar = async () => {
    if (!importacion.importadoraId) {
      showAlert({
        type: "warning",
        title: "Campo requerido",
        message: "La importadora es requerida",
      });
      return;
    }

    if (!importacion.proveedorId) {
      showAlert({
        type: "warning",
        title: "Campo requerido",
        message: "El proveedor es requerido",
      });
      return;
    }

    if (productosAgregados.length === 0) {
      showAlert({
        type: "warning",
        title: "Sin productos",
        message: "Debe agregar al menos un producto",
      });
      return;
    }

    // Validar que la utilidad estimada no sea negativa
    if (totalesContenedor && totalesContenedor.utilidadEstimada < 0) {
      showAlert({
        type: "error",
        title: "Utilidad negativa",
        message: `No se puede guardar una importación con utilidad estimada negativa.\n\nUtilidad actual: ${totalesContenedor.utilidadEstimada.toLocaleString("es-CU", { maximumFractionDigits: 2 })} CUP\n\nRevise los precios, márgenes o gastos para obtener una utilidad positiva.`,
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/importaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importacion: {
            fecha: new Date(importacion.fecha),
            numeroContenedor: importacion.numeroContenedor || null,
            importadoraId: importacion.importadoraId,
            proveedorId: importacion.proveedorId,
            observaciones: importacion.observaciones || null,
            ...porcentajes,
          },
          tasasCambio: tasasCambio.map((t) => ({
            monedaId: t.monedaId,
            tasaCambio: t.tasaCambio,
          })),
          gastos: gastos.map((g) => ({
            tipoGastoId: g.tipoGastoId,
            monedaId: g.monedaId,
            monto: g.monto,
            descripcion: g.descripcion || null,
          })),
          productos: productosAgregados.map((p) => ({
            productoId: p.productoId,
            cantidadUnidades: p.cantidadUnidades,
            precioUnitarioUSD: p.precioUnitarioUSD, // Precio por unidad (la API calcula el importe)
            porcentajeMerma: p.porcentajeMerma,
            margenUtilidad: p.margenUtilidad,
            mediaPrecioFiscal: p.mediaPrecioFiscal,
            mediaPrecioFiscalEfectivo: p.mediaPrecioFiscalEfectivo,
            ventaRealEstimada: p.ventaRealEstimada,
          })),
        }),
      });

      if (response.ok) {
        router.push("/importaciones");
      } else {
        const data = await response.json();
        showAlert({
          type: "error",
          title: "Error",
          message: data.error || "Error al guardar importación",
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
      setLoading(false);
    }
  };

  // ============================================
  // HELPERS
  // ============================================

  const formatCurrency = (value: number | undefined, currency: string = "USD") => {
    if (value === undefined) return "-";
    const formatted = value.toLocaleString("es-CU", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });
    return currency === "USD" ? `$${formatted}` : `${formatted} ${currency}`;
  };

  // totalImporteUSD ahora viene de totalImporteUSD

  // Agrupar gastos por moneda para el resumen
  const gastosPorMoneda = useMemo(() => {
    const grupos: Record<string, { monto: number; monedaCodigo: string }> = {};
    for (const gasto of gastos) {
      if (!grupos[gasto.monedaCodigo]) {
        grupos[gasto.monedaCodigo] = { monto: 0, monedaCodigo: gasto.monedaCodigo };
      }
      grupos[gasto.monedaCodigo].monto += gasto.monto;
    }
    return Object.values(grupos);
  }, [gastos]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Nuevo Contenedor</h1>
        <p className="text-sm text-muted">Registra un nuevo contenedor de importación</p>
      </div>

      {/* Sección 1: Datos del Contenedor */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Datos del Contenedor</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Input
            label="Fecha"
            type="date"
            value={importacion.fecha}
            onChange={(e) => setImportacion({ ...importacion, fecha: e.target.value })}
            required
          />
          <Input
            label="Nro. Contenedor"
            placeholder="Ej: MSKU1234567"
            value={importacion.numeroContenedor}
            onChange={(e) => setImportacion({ ...importacion, numeroContenedor: e.target.value })}
          />
          <Select
            label="Importadora"
            value={
              importacion.importadoraId
                ? {
                    value: importacion.importadoraId,
                    label: importadorasDisponibles.find((i) => i.id === importacion.importadoraId)?.nombre || "",
                  }
                : null
            }
            onChange={(opt) => setImportacion({ ...importacion, importadoraId: opt ? Number(opt.value) : 0 })}
            options={importadorasDisponibles.map((i) => ({ value: i.id, label: i.nombre }))}
            placeholder="Seleccionar importadora..."
            required
          />
          <Select
            label="Proveedor"
            value={
              importacion.proveedorId
                ? {
                    value: importacion.proveedorId,
                    label: proveedoresDisponibles.find((p) => p.id === importacion.proveedorId)?.nombre || "",
                  }
                : null
            }
            onChange={(opt) => setImportacion({ ...importacion, proveedorId: opt ? Number(opt.value) : 0 })}
            options={proveedoresDisponibles.map((p) => ({ value: p.id, label: p.nombre }))}
            placeholder="Seleccionar proveedor..."
            required
          />
          <Input
            label="Observaciones"
            placeholder="Notas adicionales..."
            value={importacion.observaciones}
            onChange={(e) => setImportacion({ ...importacion, observaciones: e.target.value })}
          />
        </div>
      </div>

      {/* Sección 2: Monedas y Tasas de Cambio */}
      <div className="card">
        <button
          type="button"
          onClick={() => setMostrarMonedas(!mostrarMonedas)}
          className="w-full flex items-center justify-between text-left"
        >
          <div>
            <h2 className="text-lg font-semibold">Monedas y Tasas de Cambio</h2>
            <p className="text-sm text-muted">Selecciona las monedas a usar y sus tasas</p>
          </div>
          {mostrarMonedas ? (
            <ChevronUpIcon className="h-5 w-5 text-muted" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-muted" />
          )}
        </button>

        {mostrarMonedas && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Monedas disponibles:
              </label>
              <div className="flex flex-wrap gap-3">
                {monedasDisponibles.map((moneda) => {
                  const seleccionada = tasasCambio.some((t) => t.monedaId === moneda.id);
                  return (
                    <label key={moneda.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={seleccionada}
                        onChange={() => handleToggleMoneda(moneda)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className={seleccionada ? "font-medium" : "text-muted"}>
                        {moneda.codigo} - {moneda.nombre}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {tasasCambio.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {tasasCambio
                  .filter((t) => t.monedaCodigo !== "CUP")
                  .map((tasa) => (
                    <Input
                      key={tasa.monedaId}
                      label={`Tasa ${tasa.monedaCodigo} → CUP`}
                      type="number"
                      step="0.0001"
                      min={0}
                      value={tasa.tasaCambio}
                      onChange={(e) => handleTasaCambio(tasa.monedaId, Number(e.target.value))}
                    />
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sección 3: Porcentajes de Cálculo */}
      <div className="card">
        <button
          type="button"
          onClick={() => setMostrarPorcentajes(!mostrarPorcentajes)}
          className="w-full flex items-center justify-between text-left"
        >
          <div>
            <h2 className="text-lg font-semibold">Porcentajes de Cálculo</h2>
            <p className="text-sm text-muted">Configura los porcentajes para esta importación</p>
          </div>
          {mostrarPorcentajes ? (
            <ChevronUpIcon className="h-5 w-5 text-muted" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-muted" />
          )}
        </button>

        {mostrarPorcentajes && (
          <div className="mt-4 pt-4 border-t border-border space-y-6">
            {/* Grupo 1: Distribución de Ventas */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">
                Distribución de Ventas
                <span className="text-muted font-normal ml-2">(debe sumar 100%)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                  label="% Venta USD"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={porcentajes.porcentajeVentaUSD}
                  onChange={(e) =>
                    setPorcentajes({ ...porcentajes, porcentajeVentaUSD: Number(e.target.value) })
                  }
                />
                <Input
                  label="% Venta Fiscal"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={porcentajes.porcentajeVentaFiscal}
                  onChange={(e) =>
                    setPorcentajes({ ...porcentajes, porcentajeVentaFiscal: Number(e.target.value) })
                  }
                />
                <Input
                  label="% Venta Efectivo"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={porcentajes.porcentajeVentaEfectivo}
                  onChange={(e) =>
                    setPorcentajes({ ...porcentajes, porcentajeVentaEfectivo: Number(e.target.value) })
                  }
                />
                {/* Indicador de suma */}
                <div className="flex flex-col justify-end">
                  <label className="label">&nbsp;</label>
                  <div className={`rounded-lg px-3 py-2 text-center border ${
                    ventasSuman100
                      ? "bg-success/10 text-success border-success/30"
                      : "bg-error/10 text-error border-error/30"
                  }`}>
                    <span className="text-xs block">Total</span>
                    <span className="font-bold">{sumaVentas.toFixed(1)}%</span>
                    {ventasSuman100 && <span className="ml-1">✓</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Grupo 2: Otros Porcentajes */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Otros Porcentajes</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <Input
                  label="% Merma"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={porcentajes.porcentajeMerma}
                  onChange={(e) =>
                    setPorcentajes({ ...porcentajes, porcentajeMerma: Number(e.target.value) })
                  }
                />
                <Input
                  label="% Margen Utilidad"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={porcentajes.porcentajeMargenUtilidad}
                  onChange={(e) =>
                    setPorcentajes({ ...porcentajes, porcentajeMargenUtilidad: Number(e.target.value) })
                  }
                />
                <Input
                  label="11% Aporte + MU"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={porcentajes.porcentajeAporteMasMargen}
                  onChange={(e) =>
                    setPorcentajes({ ...porcentajes, porcentajeAporteMasMargen: Number(e.target.value) })
                  }
                />
                <Input
                  label="% Margen Comercial"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={porcentajes.porcentajeMargenComercial}
                  onChange={(e) =>
                    setPorcentajes({ ...porcentajes, porcentajeMargenComercial: Number(e.target.value) })
                  }
                />
                <Input
                  label="% Otros Gastos"
                  type="number"
                  step="0.1"
                  min={0}
                  max={100}
                  value={porcentajes.porcentajeOtrosGastos}
                  onChange={(e) =>
                    setPorcentajes({ ...porcentajes, porcentajeOtrosGastos: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            {/* Botón restaurar */}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPorcentajes(PORCENTAJES_DEFAULTS)}
              >
                Restaurar Valores
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Sección 4: Gastos Asociados */}
      <div className="card">
        <button
          type="button"
          onClick={() => setMostrarGastos(!mostrarGastos)}
          className="w-full flex items-center justify-between text-left"
        >
          <div>
            <h2 className="text-lg font-semibold">Gastos Asociados al Contenedor</h2>
            <p className="text-sm text-muted">Aranceles, fletes, servicios y otros gastos</p>
          </div>
          {mostrarGastos ? (
            <ChevronUpIcon className="h-5 w-5 text-muted" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-muted" />
          )}
        </button>

        {mostrarGastos && (
          <div className="mt-4 pt-4 border-t border-border">
            {/* Formulario agregar gasto */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              <Select
                label="Tipo de Gasto"
                value={
                  gastoActual.tipoGastoId
                    ? {
                        value: gastoActual.tipoGastoId,
                        label: tiposGastoDisponibles.find((t) => t.id === gastoActual.tipoGastoId)?.nombre || "",
                      }
                    : null
                }
                onChange={(opt) => setGastoActual({ ...gastoActual, tipoGastoId: opt ? Number(opt.value) : 0 })}
                options={tiposGastoDisponibles.map((t) => ({ value: t.id, label: t.nombre }))}
                placeholder="Seleccionar..."
              />
              <Select
                label="Moneda"
                value={
                  gastoActual.monedaId
                    ? {
                        value: gastoActual.monedaId,
                        label: tasasCambio.find((t) => t.monedaId === gastoActual.monedaId)?.monedaCodigo || "",
                      }
                    : null
                }
                onChange={(opt) => setGastoActual({ ...gastoActual, monedaId: opt ? Number(opt.value) : 0 })}
                options={tasasCambio.map((t) => ({ value: t.monedaId, label: t.monedaCodigo }))}
                placeholder="Moneda..."
              />
              <Input
                label="Monto"
                type="number"
                step="0.01"
                min={0}
                value={gastoActual.monto || ""}
                onChange={(e) => setGastoActual({ ...gastoActual, monto: Number(e.target.value) })}
              />
              <Input
                label="Descripción"
                placeholder="Ej: DUA 12345"
                value={gastoActual.descripcion}
                onChange={(e) => setGastoActual({ ...gastoActual, descripcion: e.target.value })}
              />
              <div className="flex items-end">
                <Button type="button" variant="secondary" onClick={handleAgregarGasto} className="w-full">
                  <PlusIcon className="h-4 w-4" />
                  Agregar
                </Button>
              </div>
            </div>

            {/* Lista de gastos */}
            {gastos.length > 0 && (
              <div className="table-container mb-4">
                <table className="table">
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
                    {gastos.map((g, index) => (
                      <tr key={index}>
                        <td className="font-medium">{g.tipoGastoNombre}</td>
                        <td className="text-muted">{g.descripcion || "-"}</td>
                        <td className="font-mono">{formatCurrency(g.monto, g.monedaCodigo)}</td>
                        <td>{g.monedaCodigo}</td>
                        <td>
                          <button
                            onClick={() => handleEliminarGasto(index)}
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

            {/* Resumen de gastos */}
            {gastos.length > 0 && (
              <div className="bg-surface-hover rounded-lg p-4">
                <h3 className="font-semibold mb-2">Totales por Moneda:</h3>
                <div className="flex flex-wrap gap-4 text-sm">
                  {gastosPorMoneda.map((g) => (
                    <span key={g.monedaCodigo}>
                      <span className="text-muted">{g.monedaCodigo}:</span>{" "}
                      <span className="font-mono font-medium">{formatCurrency(g.monto, g.monedaCodigo)}</span>
                    </span>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-border">
                  <span className="text-muted">Total en CUP:</span>{" "}
                  <span className="font-mono font-bold text-primary">{formatCurrency(totalGastosCUP, "CUP")}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sección 5: Agregar Producto */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Agregar Producto</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select
            label="Producto"
            value={productoSeleccionado}
            onChange={setProductoSeleccionado}
            options={productosDisponibles.map((p) => ({
              value: p.id,
              label: `${p.nombre}${p.descripcion ? ` - ${p.descripcion}` : ""}`,
            }))}
            placeholder="Seleccionar producto..."
            required
          />
          <Input
            label="Cantidad (unidades)"
            type="number"
            min={1}
            value={productoActual.cantidadUnidades || ""}
            onChange={(e) => {
              const cantidad = Number(e.target.value);
              // Al cambiar cantidad, recalcular según el campo que tiene el valor "maestro"
              if (campoEditado === 'precio') {
                setProductoActual({
                  ...productoActual,
                  cantidadUnidades: cantidad,
                  importeUSD: cantidad * productoActual.precioUnitarioUSD,
                });
              } else {
                // Si el importe es el maestro, recalcular precio unitario
                const nuevoPrecio = cantidad > 0 ? productoActual.importeUSD / cantidad : 0;
                setProductoActual({
                  ...productoActual,
                  cantidadUnidades: cantidad,
                  precioUnitarioUSD: nuevoPrecio,
                });
              }
            }}
            required
          />
          {/* Precio Unitario - con indicador si es calculado */}
          <Input
            label={
              <span className="flex items-center gap-1">
                Precio Unit. USD
                {campoEditado === 'importe' && productoActual.cantidadUnidades > 0 && (
                  <CalculatorIcon className="h-3.5 w-3.5 text-primary" title="Calculado" />
                )}
              </span>
            }
            type="number"
            step="0.0001"
            min={0}
            value={productoActual.precioUnitarioUSD || ""}
            onChange={(e) => {
              const precio = Number(e.target.value);
              setCampoEditado('precio');
              setProductoActual({
                ...productoActual,
                precioUnitarioUSD: precio,
                importeUSD: precio * productoActual.cantidadUnidades,
              });
            }}
            className={campoEditado === 'importe' ? 'bg-primary/5 border-primary/30' : ''}
            required
          />
          {/* Importe Total - con indicador si es calculado */}
          <Input
            label={
              <span className="flex items-center gap-1">
                Importe Total USD
                {campoEditado === 'precio' && productoActual.cantidadUnidades > 0 && (
                  <CalculatorIcon className="h-3.5 w-3.5 text-primary" title="Calculado" />
                )}
              </span>
            }
            type="number"
            step="0.01"
            min={0}
            value={productoActual.importeUSD || ""}
            onChange={(e) => {
              const importe = Number(e.target.value);
              setCampoEditado('importe');
              const nuevoPrecio = productoActual.cantidadUnidades > 0
                ? importe / productoActual.cantidadUnidades
                : 0;
              setProductoActual({
                ...productoActual,
                importeUSD: importe,
                precioUnitarioUSD: nuevoPrecio,
              });
            }}
            className={campoEditado === 'precio' ? 'bg-primary/5 border-primary/30' : ''}
            required
          />
          <Input
            label="% Merma"
            type="number"
            step="0.1"
            min={0}
            max={100}
            value={productoActual.porcentajeMerma}
            onChange={(e) =>
              setProductoActual({ ...productoActual, porcentajeMerma: Number(e.target.value) })
            }
          />
          <Input
            label="% Margen"
            type="number"
            step="0.1"
            min={0}
            max={100}
            value={productoActual.margenUtilidad}
            onChange={(e) =>
              setProductoActual({ ...productoActual, margenUtilidad: Number(e.target.value) })
            }
          />
          <Input
            label="Media Precio Fiscal"
            type="number"
            step="0.01"
            min={0}
            value={productoActual.mediaPrecioFiscal}
            onChange={(e) =>
              setProductoActual({ ...productoActual, mediaPrecioFiscal: Number(e.target.value) })
            }
          />
          <Input
            label="Media Precio Fiscal Efectivo"
            type="number"
            step="0.01"
            min={0}
            value={productoActual.mediaPrecioFiscalEfectivo}
            onChange={(e) =>
              setProductoActual({ ...productoActual, mediaPrecioFiscalEfectivo: Number(e.target.value) })
            }
          />
          <Input
            label="Venta Real Estimada CUP"
            type="number"
            step="0.01"
            min={0}
            placeholder="Opcional"
            value={productoActual.ventaRealEstimada || ""}
            onChange={(e) =>
              setProductoActual({
                ...productoActual,
                ventaRealEstimada: e.target.value ? Number(e.target.value) : null
              })
            }
          />
        </div>
        <div className="mt-4">
          <Button onClick={handleAgregarProducto} variant="secondary">
            <PlusIcon className="h-4 w-4" />
            Agregar Producto
          </Button>
        </div>
      </div>

      {/* Sección 6: Productos y Cálculos */}
      {productosConCalculos.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Productos del Contenedor</h2>
          <div className="table-container overflow-x-auto">
            <table className="table text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-surface z-10">Producto</th>
                  <th>Cantidad</th>
                  <th>Precio Unit.</th>
                  <th>Importe USD</th>
                  <th>% Factura</th>
                  <th>Cant. Vendible</th>
                  <th>% Merma</th>
                  <th>Gastos Prorr.</th>
                  <th>Costo Unit.</th>
                  <th>Costo Bruto</th>
                  <th>Precio USD</th>
                  <th>Precio CUP</th>
                  <th>Precio Fiscal</th>
                  <th>Unid. Recup.</th>
                  <th>% Recup.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {productosConCalculos.map((p, index) => (
                  <tr key={index}>
                    <td className="font-medium sticky left-0 bg-surface">{p.productoNombre}</td>
                    <td>{p.cantidadUnidades.toLocaleString()}</td>
                    <td className="font-mono">{formatCurrency(p.precioUnitarioUSD)}</td>
                    <td className="font-mono">{formatCurrency(p.importeUSD)}</td>
                    <td className="font-medium text-primary">
                      <TooltipFormula
                        valor={`${(p.porcentajeFactura || 0).toFixed(1)}%`}
                        descripcion="% de la Factura"
                        formula={`ImporteProducto / TotalImporte × 100\n${formatCurrency(p.importeUSD)} / ${formatCurrency(totalImporteUSD)} × 100\n= ${(p.porcentajeFactura || 0).toFixed(1)}%`}
                      />
                    </td>
                    <td>
                      {p.calculos && (
                        <TooltipFormula
                          valor={p.calculos.cantidadVendible.toLocaleString("es-CU", { maximumFractionDigits: 0 })}
                          descripcion="Cantidad Vendible"
                          formula={`Cantidad × (1 - %Merma/100)\n${p.cantidadUnidades} × (1 - ${p.porcentajeMerma}/100)\n= ${p.calculos.cantidadVendible.toFixed(0)}`}
                        />
                      )}
                    </td>
                    <td className="text-muted">{p.porcentajeMerma}%</td>
                    <td className="text-muted">
                      {p.gastosPorrateadosCUP !== undefined && (
                        <TooltipFormula
                          valor={formatCurrency(p.gastosPorrateadosCUP, "CUP")}
                          descripcion="Gastos Prorrateados por Inversión"
                          formula={`TotalGastos × (ImporteProd/TotalImporte)\n${formatCurrency(totalGastosCUP, "CUP")} × (${formatCurrency(p.importeUSD)}/${formatCurrency(totalImporteUSD)})\n= ${formatCurrency(p.gastosPorrateadosCUP, "CUP")}`}
                        />
                      )}
                    </td>
                    <td>
                      {p.calculos && (
                        <TooltipFormula
                          valor={formatCurrency(p.calculos.costoUnitarioUSD)}
                          descripcion="Costo Unitario USD"
                          formula={`ImporteUSD / Cantidad\n${formatCurrency(p.importeUSD)} / ${p.cantidadUnidades}\n= ${formatCurrency(p.calculos.costoUnitarioUSD)}`}
                        />
                      )}
                    </td>
                    <td>
                      {p.calculos && (
                        <TooltipFormula
                          valor={formatCurrency(p.calculos.costoBrutoUnitario)}
                          descripcion="Costo Bruto Unitario"
                          formula={`CostoUSD + (GastosProrr/Cant/TC)\n${formatCurrency(p.calculos.costoUnitarioUSD)} + (${formatCurrency(p.gastosPorrateadosCUP || 0, "CUP")}/${p.cantidadUnidades}/${tasaUSD})\n= ${formatCurrency(p.calculos.costoBrutoUnitario)}`}
                        />
                      )}
                    </td>
                    <td className="font-medium text-success">
                      {p.calculos && (
                        <TooltipFormula
                          valor={formatCurrency(p.calculos.precioVentaUSD)}
                          descripcion="Precio Venta USD"
                          formula={`CostoUSD / (MargenComercial/100)\n${formatCurrency(p.calculos.costoUnitarioUSD)} / (${porcentajes.porcentajeMargenComercial}/100)\n= ${formatCurrency(p.calculos.precioVentaUSD)}`}
                        />
                      )}
                    </td>
                    <td className="font-medium text-primary">
                      {p.calculos && (
                        <TooltipFormula
                          valor={formatCurrency(p.calculos.precioVentaCUP, "CUP")}
                          descripcion="Precio Venta CUP"
                          formula={`PrecioUSD × TasaCambio\n${formatCurrency(p.calculos.precioVentaUSD)} × ${tasaUSD}\n= ${formatCurrency(p.calculos.precioVentaCUP, "CUP")}`}
                        />
                      )}
                    </td>
                    <td>
                      {p.calculos && (
                        <TooltipFormula
                          valor={formatCurrency(p.calculos.precioFiscalCUP, "CUP")}
                          descripcion="Precio Fiscal CUP"
                          formula={`mediaPrecioFiscal (sin × 90%)\n= ${p.mediaPrecioFiscal} CUP`}
                        />
                      )}
                    </td>
                    <td>
                      {p.calculos && (
                        <TooltipFormula
                          valor={p.calculos.unidadesParaRecuperar.toLocaleString("es-CU", { maximumFractionDigits: 0 })}
                          descripcion="Unidades para Recuperar"
                          formula={`InversiónTotal / PrecioVentaUSD\n${formatCurrency(p.calculos.inversionTotal)} / ${formatCurrency(p.calculos.precioVentaUSD)}\n= ${p.calculos.unidadesParaRecuperar.toFixed(0)}`}
                        />
                      )}
                    </td>
                    <td className={p.calculos && p.calculos.porcentajeUnidadesRecuperar > 100 ? "text-error" : "text-success"}>
                      {p.calculos && (
                        <TooltipFormula
                          valor={`${p.calculos.porcentajeUnidadesRecuperar.toFixed(1)}%`}
                          descripcion="% Unidades para Recuperar"
                          formula={`UnidRecuperar / CantVendible × 100\n${p.calculos.unidadesParaRecuperar.toFixed(0)} / ${p.calculos.cantidadVendible.toFixed(0)} × 100\n= ${p.calculos.porcentajeUnidadesRecuperar.toFixed(1)}%`}
                        />
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => handleEliminarProducto(index)}
                        className="p-1 text-muted hover:text-error transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-hover font-semibold">
                  <td className="sticky left-0 bg-surface-hover">TOTAL</td>
                  <td>{totalUnidades.toLocaleString()}</td>
                  <td>-</td>
                  <td>{formatCurrency(totalImporteUSD)}</td>
                  <td>100%</td>
                  <td>{totalesContenedor?.cantidadVendible.toLocaleString("es-CU", { maximumFractionDigits: 0 })}</td>
                  <td>{totalesContenedor?.cantidadMerma.toLocaleString("es-CU", { maximumFractionDigits: 0 })}</td>
                  <td>{formatCurrency(totalGastosCUP, "CUP")}</td>
                  <td colSpan={8}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Distribución de Ventas por Canal */}
          <div className="mt-6 bg-surface-hover rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              Distribución de Ventas por Canal
              <span className="text-xs font-normal text-muted">(basado en Leyenda)</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="table text-sm">
                <thead>
                  <tr>
                    <th>Canal</th>
                    <th>% Leyenda</th>
                    <th>Cantidad</th>
                    <th>Precio Unit.</th>
                    <th>Venta Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="font-medium">Venta USD</td>
                    <td>{porcentajes.porcentajeVentaUSD}%</td>
                    <td>
                      <TooltipFormula
                        valor={totalesContenedor?.cantidadVentaUSD.toLocaleString("es-CU", { maximumFractionDigits: 0 }) || "-"}
                        descripcion="Cantidad Venta USD"
                        formula={`CantVendible × %VentaUSD/100\n${totalesContenedor?.cantidadVendible.toFixed(0)} × ${porcentajes.porcentajeVentaUSD}/100`}
                      />
                    </td>
                    <td>
                      <TooltipFormula
                        valor={productosConCalculos[0]?.calculos ? formatCurrency(productosConCalculos[0].calculos.precioVentaCUP, "CUP") : "-"}
                        descripcion="Precio Venta CUP"
                        formula="PrecioUSD × TasaCambio"
                      />
                    </td>
                    <td className="font-medium text-primary">
                      <TooltipFormula
                        valor={formatCurrency(totalesContenedor?.ventaUSDEnCUP || 0, "CUP")}
                        descripcion="Venta USD en CUP"
                        formula="CantidadUSD × PrecioVentaCUP"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="font-medium">Venta Fiscal</td>
                    <td>{porcentajes.porcentajeVentaFiscal}%</td>
                    <td>
                      <TooltipFormula
                        valor={totalesContenedor?.cantidadVentaFiscal.toLocaleString("es-CU", { maximumFractionDigits: 0 }) || "-"}
                        descripcion="Cantidad Venta Fiscal"
                        formula={`CantVendible × %VentaFiscal/100\n${totalesContenedor?.cantidadVendible.toFixed(0)} × ${porcentajes.porcentajeVentaFiscal}/100`}
                      />
                    </td>
                    <td>
                      <TooltipFormula
                        valor={productosConCalculos[0]?.calculos ? formatCurrency(productosConCalculos[0].calculos.precioFiscalCUP, "CUP") : "-"}
                        descripcion="Precio Fiscal CUP"
                        formula="mediaPrecioFiscal (sin × 90%)"
                      />
                    </td>
                    <td className="font-medium">
                      <TooltipFormula
                        valor={formatCurrency(totalesContenedor?.ventaFiscalCUP || 0, "CUP")}
                        descripcion="Venta Fiscal CUP"
                        formula="CantidadFiscal × PrecioFiscalCUP"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="font-medium">Venta Efectivo</td>
                    <td>{porcentajes.porcentajeVentaEfectivo}%</td>
                    <td>
                      <TooltipFormula
                        valor={totalesContenedor?.cantidadVentaEfectivo.toLocaleString("es-CU", { maximumFractionDigits: 0 }) || "-"}
                        descripcion="Cantidad Venta Efectivo"
                        formula={`CantVendible × %VentaEfectivo/100\n${totalesContenedor?.cantidadVendible.toFixed(0)} × ${porcentajes.porcentajeVentaEfectivo}/100`}
                      />
                    </td>
                    <td>
                      <TooltipFormula
                        valor={productosConCalculos[0]?.calculos ? formatCurrency(productosConCalculos[0].calculos.precioEfectivoCUP, "CUP") : "-"}
                        descripcion="Precio Efectivo CUP"
                        formula="mediaPrecioFiscalEfectivo × 90%"
                      />
                    </td>
                    <td className="font-medium">
                      <TooltipFormula
                        valor={formatCurrency(totalesContenedor?.ventaEfectivoCUP || 0, "CUP")}
                        descripcion="Venta Efectivo CUP"
                        formula="CantidadEfectivo × PrecioEfectivoCUP"
                      />
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-primary/10 font-semibold">
                    <td colSpan={4}>VENTA TOTAL FISCAL</td>
                    <td className="text-primary text-lg">
                      <TooltipFormula
                        valor={formatCurrency(totalesContenedor?.ventaTotalFiscal || 0, "CUP")}
                        descripcion="Venta Total Fiscal"
                        formula="VentaUSD + VentaFiscal + VentaEfectivo"
                      />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Costos e Impuestos */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface-hover rounded-lg p-4">
              <h3 className="font-semibold mb-3">Costos</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Costo Productos (USD→CUP)</span>
                  <TooltipFormula
                    valor={formatCurrency(totalesContenedor?.costoProductosCUP || 0, "CUP")}
                    descripcion="Costo Productos"
                    formula={`ImporteUSD × TasaCambio\n${formatCurrency(totalImporteUSD)} × ${tasaUSD}`}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Gastos Contenedor</span>
                  <span className="font-mono">{formatCurrency(totalGastosCUP, "CUP")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">+11% Aporte (deducible)</span>
                  <TooltipFormula
                    valor={formatCurrency(totalesContenedor?.aporte11Porciento || 0, "CUP")}
                    descripcion="11% Aporte sobre Ventas"
                    formula="VentaTotalFiscal × 11%"
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">+{porcentajes.porcentajeOtrosGastos}% Otros Gastos</span>
                  <TooltipFormula
                    valor={formatCurrency(totalesContenedor?.otrosGastosPorciento || 0, "CUP")}
                    descripcion={`${porcentajes.porcentajeOtrosGastos}% Otros Gastos (11% deducible)`}
                    formula={`(Costo + Gastos + 11%Aporte) / ${(1 - porcentajes.porcentajeOtrosGastos/100).toFixed(2)} - base`}
                  />
                </div>
                <div className="flex justify-between pt-2 border-t border-border font-semibold">
                  <span>Costo Total Bruto</span>
                  <TooltipFormula
                    valor={formatCurrency(totalesContenedor?.costoTotalBruto || 0, "CUP")}
                    descripcion="Costo Total Bruto"
                    formula={`CostoProductos + Gastos + 11%Aporte + ${porcentajes.porcentajeOtrosGastos}%OtrosGastos`}
                    className="text-error"
                  />
                </div>
              </div>
            </div>

            <div className="bg-surface-hover rounded-lg p-4">
              <h3 className="font-semibold mb-3">Impuestos</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">11% Aporte sobre Ventas</span>
                  <TooltipFormula
                    valor={formatCurrency(totalesContenedor?.aporte11Porciento || 0, "CUP")}
                    descripcion="11% Aporte"
                    formula={`VentaTotalFiscal × 11%\n${formatCurrency(totalesContenedor?.ventaTotalFiscal || 0, "CUP")} × 0.11`}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">35% Impuesto Utilidad</span>
                  <TooltipFormula
                    valor={formatCurrency(totalesContenedor?.impuesto35Utilidad || 0, "CUP")}
                    descripcion="35% Impuesto"
                    formula="UtilidadEstimada × 35%"
                  />
                </div>
                <div className="flex justify-between pt-2 border-t border-border font-semibold">
                  <span>Total Impuestos</span>
                  <TooltipFormula
                    valor={formatCurrency(totalesContenedor?.totalImpuestos || 0, "CUP")}
                    descripcion="Total Impuestos"
                    formula="11%Aporte + 35%Impuesto"
                    className="text-error"
                  />
                </div>
                <div className="flex justify-between text-muted">
                  <span>Carga Tributaria</span>
                  <TooltipFormula
                    valor={`${(totalesContenedor?.cargaTributaria || 0).toFixed(2)}%`}
                    descripcion="Carga Tributaria"
                    formula="TotalImpuestos / VentaTotalFiscal × 100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Análisis de Utilidad */}
          <div className="mt-4 bg-gradient-to-r from-primary/10 to-success/10 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Análisis de Utilidad</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted block">Utilidad Estimada</span>
                <TooltipFormula
                  valor={formatCurrency(totalesContenedor?.utilidadEstimada || 0, "CUP")}
                  descripcion="Utilidad Estimada"
                  formula="VentaTotalFiscal - CostoTotalBruto"
                  className="font-mono font-bold text-lg"
                />
              </div>
              <div>
                <span className="text-muted block">% Utilidad</span>
                <TooltipFormula
                  valor={`${(totalesContenedor?.porcentajeUtilidadEstimada || 0).toFixed(4)}%`}
                  descripcion="% Utilidad Estimada"
                  formula="UtilidadEstimada / VentaTotalFiscal × 100"
                  className="font-mono font-bold text-lg"
                />
              </div>
              <div>
                <span className="text-muted block">Total Impuestos</span>
                <span className="font-mono font-bold text-lg text-error">
                  {formatCurrency(totalesContenedor?.totalImpuestos || 0, "CUP")}
                </span>
              </div>
              <div>
                <span className="text-muted block">Utilidad Bruta Real</span>
                <TooltipFormula
                  valor={formatCurrency(totalesContenedor?.utilidadBrutaReal || 0, "CUP")}
                  descripcion="Utilidad Bruta Real"
                  formula="VentaTotalFiscal - CostoTotalBruto - TotalImpuestos"
                  className={`font-mono font-bold text-lg ${(totalesContenedor?.utilidadBrutaReal || 0) >= 0 ? "text-success" : "text-error"}`}
                />
              </div>
            </div>
          </div>

          {/* Venta Real Estimada */}
          {totalVentaRealEstimada > 0 && (
            <div className="mt-4 bg-warning/10 border border-warning/30 rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                Análisis sobre Venta Real Estimada
                <span className="text-xs font-normal text-muted">(dato ingresado por el usuario)</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted block">Venta Real Estimada</span>
                  <span className="font-mono font-bold text-lg">{formatCurrency(totalVentaRealEstimada, "CUP")}</span>
                </div>
                <div>
                  <span className="text-muted block">Total Impuestos</span>
                  <span className="font-mono font-bold text-lg text-error">
                    {formatCurrency(totalesContenedor?.totalImpuestos || 0, "CUP")}
                  </span>
                </div>
                <div>
                  <span className="text-muted block">Carga sobre Venta Real</span>
                  <TooltipFormula
                    valor={`${cargaSobreVentaReal.toFixed(4)}%`}
                    descripcion="Carga Tributaria sobre Venta Real"
                    formula={`TotalImpuestos / VentaRealEstimada × 100\n${formatCurrency(totalesContenedor?.totalImpuestos || 0, "CUP")} / ${formatCurrency(totalVentaRealEstimada, "CUP")} × 100`}
                    className={`font-mono font-bold text-lg ${cargaSobreVentaReal > 50 ? "text-error" : "text-warning"}`}
                  />
                </div>
                <div>
                  <span className="text-muted block">Utilidad s/Venta Real</span>
                  <span className={`font-mono font-bold text-lg ${(totalVentaRealEstimada - (totalesContenedor?.costoTotalBruto || 0) - (totalesContenedor?.totalImpuestos || 0)) >= 0 ? "text-success" : "text-error"}`}>
                    {formatCurrency(totalVentaRealEstimada - (totalesContenedor?.costoTotalBruto || 0) - (totalesContenedor?.totalImpuestos || 0), "CUP")}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Resumen Rápido */}
          <div className="mt-4 bg-surface-hover rounded-lg p-4">
            <h3 className="font-semibold mb-3">Resumen de Inversión</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted block">Importe Total USD</span>
                <span className="font-mono font-bold text-lg">{formatCurrency(totalImporteUSD)}</span>
              </div>
              <div>
                <span className="text-muted block">Importe en CUP (@ {tasaUSD})</span>
                <span className="font-mono font-bold text-lg">{formatCurrency(totalImporteUSD * tasaUSD, "CUP")}</span>
              </div>
              <div>
                <span className="text-muted block">Total Gastos CUP</span>
                <span className="font-mono font-bold text-lg">{formatCurrency(totalGastosCUP, "CUP")}</span>
              </div>
              <div>
                <span className="text-muted block">Inversión Total CUP</span>
                <span className="font-mono font-bold text-lg text-primary">
                  {formatCurrency(totalesContenedor?.inversionTotal ? totalesContenedor.inversionTotal * tasaUSD : totalImporteUSD * tasaUSD + totalGastosCUP, "CUP")}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button onClick={handleGuardar} loading={loading} disabled={productosAgregados.length === 0}>
          <CalculatorIcon className="h-4 w-4" />
          Guardar Contenedor
        </Button>
      </div>
    </div>
  );
}

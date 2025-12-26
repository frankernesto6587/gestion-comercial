import { z } from "zod";

// ============================================
// PRODUCTOS
// ============================================
export const productoSchema = z.object({
  codefref: z.coerce.number().int().positive("Debe ser un número positivo").optional().nullable(),
  nombre: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100, "Máximo 100 caracteres"),
  descripcion: z.string().max(255, "Máximo 255 caracteres").optional(),
  unidadMedida: z.string().default("unidad"),
  pack: z.coerce.number().int().min(1, "El pack debe ser al menos 1").default(24),
  activo: z.boolean().default(true),
});

export type ProductoInput = z.infer<typeof productoSchema>;

// ============================================
// IMPORTACIONES
// ============================================
export const importacionSchema = z.object({
  fecha: z.coerce.date().default(() => new Date()),
  numeroContenedor: z.string().max(50, "Máximo 50 caracteres").optional().nullable(),
  importadoraId: z.coerce.number().int().positive("Debe seleccionar una importadora"),
  proveedorId: z.coerce.number().int().positive("Debe seleccionar un proveedor"),
  observaciones: z.string().max(500, "Máximo 500 caracteres").optional().nullable(),
  // Parámetros de la Leyenda (configurables por importación)
  porcentajeVentaUSD: z.coerce.number().min(0).max(100).default(91),
  porcentajeMerma: z.coerce.number().min(0).max(100).default(2),
  porcentajeMargenUtilidad: z.coerce.number().min(0).max(100).default(4),
  porcentajeAporteMasMargen: z.coerce.number().min(0).max(100).default(15),
  porcentajeMargenComercial: z.coerce.number().min(0).max(100).default(85),
  porcentajeVentaFiscal: z.coerce.number().min(0).max(100).default(5),
  porcentajeVentaEfectivo: z.coerce.number().min(0).max(100).default(4),
});

export type ImportacionInput = z.infer<typeof importacionSchema>;

// ============================================
// PRODUCTOS IMPORTADOS
// ============================================
export const productoImportadoSchema = z.object({
  productoId: z.coerce.number().int().positive("Debe seleccionar un producto"),
  cantidadUnidades: z.coerce
    .number()
    .int()
    .positive("La cantidad debe ser mayor a 0"),
  // Precio por unidad (input del usuario) - el importe total se calcula
  precioUnitarioUSD: z.coerce.number().positive("El precio unitario debe ser mayor a 0"),
  // Importe total calculado = precioUnitarioUSD * cantidadUnidades
  importeUSD: z.coerce.number().min(0).optional(),
  // Parámetros de cálculo por producto (pueden diferir del contenedor)
  porcentajeMerma: z.coerce.number().min(0).max(100).default(2),
  margenUtilidad: z.coerce.number().min(0).max(100).default(15),
  mediaPrecioFiscal: z.coerce.number().min(0).default(173),
  mediaPrecioFiscalEfectivo: z.coerce.number().min(0).default(173),
  // Venta Real Estimada (dato de entrada del usuario)
  ventaRealEstimada: z.coerce.number().min(0).optional().nullable(),
});

export type ProductoImportadoInput = z.infer<typeof productoImportadoSchema>;

// ============================================
// MONEDAS
// ============================================
export const monedaSchema = z.object({
  codigo: z.string().min(1, "El código es requerido").max(10, "Máximo 10 caracteres"),
  nombre: z.string().min(1, "El nombre es requerido").max(100, "Máximo 100 caracteres"),
  simbolo: z.string().min(1).max(5).default("$"),
  tasaDefecto: z.coerce.number().positive("La tasa debe ser mayor a 0"),
  activo: z.boolean().default(true),
});

export type MonedaInput = z.infer<typeof monedaSchema>;

// ============================================
// TIPOS DE GASTO
// ============================================
export const tipoGastoSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(100, "Máximo 100 caracteres"),
  descripcion: z.string().max(255, "Máximo 255 caracteres").optional().nullable(),
  activo: z.boolean().default(true),
});

export type TipoGastoInput = z.infer<typeof tipoGastoSchema>;

// ============================================
// IMPORTADORAS
// ============================================
export const importadoraSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(100, "Máximo 100 caracteres"),
  descripcion: z.string().max(255, "Máximo 255 caracteres").optional().nullable(),
  activo: z.boolean().default(true),
});

export type ImportadoraInput = z.infer<typeof importadoraSchema>;

// ============================================
// PROVEEDORES
// ============================================
export const proveedorSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(100, "Máximo 100 caracteres"),
  descripcion: z.string().max(255, "Máximo 255 caracteres").optional().nullable(),
  activo: z.boolean().default(true),
});

export type ProveedorInput = z.infer<typeof proveedorSchema>;

// ============================================
// TASAS DE CAMBIO POR CONTENEDOR
// ============================================
export const tasaCambioContenedorSchema = z.object({
  monedaId: z.coerce.number().int().positive("Debe seleccionar una moneda"),
  tasaCambio: z.coerce.number().positive("La tasa debe ser mayor a 0"),
});

export type TasaCambioContenedorInput = z.infer<typeof tasaCambioContenedorSchema>;

// ============================================
// GASTOS DEL CONTENEDOR
// ============================================
export const gastoContenedorSchema = z.object({
  tipoGastoId: z.coerce.number().int().positive("Debe seleccionar un tipo de gasto"),
  monedaId: z.coerce.number().int().positive("Debe seleccionar una moneda"),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  descripcion: z.string().max(255, "Máximo 255 caracteres").optional().nullable(),
});

export type GastoContenedorInput = z.infer<typeof gastoContenedorSchema>;

// ============================================
// MOVIMIENTOS DE INVENTARIO
// ============================================
export const movimientoSchema = z.object({
  inventarioId: z.coerce.number().int().positive(),
  tipo: z.enum(["ENTRADA", "SALIDA", "MERMA", "AJUSTE_POS", "AJUSTE_NEG"]),
  cantidad: z.coerce.number().int().positive("La cantidad debe ser mayor a 0"),
  motivo: z.string().max(255, "Máximo 255 caracteres").optional(),
  referencia: z.string().max(100, "Máximo 100 caracteres").optional(),
  fecha: z.coerce.date().default(() => new Date()),
});

export type MovimientoInput = z.infer<typeof movimientoSchema>;

// ============================================
// CONFIGURACIÓN
// ============================================
export const configuracionSchema = z.object({
  clave: z.string().min(1).max(50),
  valor: z.string().min(1).max(255),
  descripcion: z.string().max(255).optional(),
});

export type ConfiguracionInput = z.infer<typeof configuracionSchema>;

// ============================================
// FILTROS Y BÚSQUEDA
// ============================================
export const paginacionSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const filtroImportacionSchema = z.object({
  fechaDesde: z.coerce.date().optional(),
  fechaHasta: z.coerce.date().optional(),
  importadora: z.string().optional(),
  busqueda: z.string().optional(),
});

export const filtroProductoSchema = z.object({
  busqueda: z.string().optional(),
  activo: z.coerce.boolean().optional(),
});

// ============================================
// VENTAS
// ============================================

// Transferencia individual (día + monto)
export const transferenciaVentaSchema = z.object({
  fecha: z.coerce.date(),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
});

export type TransferenciaVentaInput = z.infer<typeof transferenciaVentaSchema>;

// Distribución de producto (porcentaje asignado)
export const distribucionProductoSchema = z.object({
  productoId: z.coerce.number().int().positive("Debe seleccionar un producto"),
  porcentaje: z.coerce.number().min(0).max(100),
});

export type DistribucionProductoInput = z.infer<typeof distribucionProductoSchema>;

// Schema para calcular preview de venta
export const calcularVentaSchema = z.object({
  fechaInicio: z.coerce.date(),
  fechaFin: z.coerce.date(),
  transferencias: z.array(transferenciaVentaSchema).min(1, "Debe agregar al menos una transferencia"),
  productos: z.array(distribucionProductoSchema).min(1, "Debe seleccionar al menos un producto"),
  modoDistribucion: z.enum(["MANUAL", "AUTO"]).default("MANUAL"),
  // Si es true, las ventas fiscales se reasignan a días hábiles del producto
  // cuando la fecha de transferencia es anterior a la fecha de importación
  permitirReasignacionFiscal: z.coerce.boolean().default(false),
});

export type CalcularVentaInput = z.infer<typeof calcularVentaSchema>;

// Schema para crear venta (después de confirmar preview)
export const crearVentaSchema = z.object({
  fechaInicio: z.coerce.date(),
  fechaFin: z.coerce.date(),
  totalTransferencias: z.coerce.number().positive(),
  totalUnidades: z.coerce.number().int().positive(),
  totalCUP: z.coerce.number().positive(),
  modoDistribucion: z.enum(["MANUAL", "AUTO"]),
  observaciones: z.string().max(500).optional().nullable(),
  transferencias: z.array(transferenciaVentaSchema),
  lineas: z.array(
    z.object({
      fecha: z.coerce.date(),
      productoId: z.coerce.number().int().positive(),
      productoImportadoId: z.coerce.number().int().positive(),
      canal: z.enum(["USD", "FISCAL", "EFECTIVO"]),
      cantidad: z.coerce.number().int().positive(),
      precioUnitario: z.coerce.number().positive(),
      subtotal: z.coerce.number().positive(),
    })
  ),
});

export type CrearVentaInput = z.infer<typeof crearVentaSchema>;

// Filtro para listar ventas
export const filtroVentaSchema = z.object({
  fechaDesde: z.coerce.date().optional(),
  fechaHasta: z.coerce.date().optional(),
});

// ============================================
// TRANSFERENCIAS (Estado de Cuenta)
// ============================================
export const transferenciaSchema = z.object({
  fecha: z.coerce.date(),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  refOrigen: z.string().max(50, "Máximo 50 caracteres").optional().nullable(),
  refCorriente: z.string().max(50, "Máximo 50 caracteres").optional().nullable(),
  ordenante: z.string().max(100, "Máximo 100 caracteres").optional().nullable(),
});

export type TransferenciaInput = z.infer<typeof transferenciaSchema>;

// Para importar múltiples transferencias desde Excel (extracto bancario)
export const importarTransferenciasExcelSchema = z.object({
  transferencias: z.array(
    z.object({
      fecha: z.coerce.date(),
      monto: z.coerce.number().positive(),
      refOrigen: z.string(),
      refCorriente: z.string().optional().nullable(),
      ordenante: z.string().optional().nullable(),
    })
  ).min(1, "Debe incluir al menos una transferencia"),
});

export type ImportarTransferenciasExcelInput = z.infer<typeof importarTransferenciasExcelSchema>;

// Legacy: Para importar transferencias simples (fecha + monto)
export const importarTransferenciasSchema = z.object({
  transferencias: z.array(
    z.object({
      fecha: z.coerce.date(),
      monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
    })
  ).min(1, "Debe incluir al menos una transferencia"),
});

export type ImportarTransferenciasInput = z.infer<typeof importarTransferenciasSchema>;

// Filtro para listar transferencias
export const filtroTransferenciaSchema = z.object({
  fechaDesde: z.coerce.date().optional(),
  fechaHasta: z.coerce.date().optional(),
  disponibles: z.coerce.boolean().optional(), // true = solo sin ventaId
});

// Schema modificado para crear ventas con transferencias existentes
export const crearVentaConTransferenciasSchema = z.object({
  fechaInicio: z.coerce.date(),
  fechaFin: z.coerce.date(),
  transferenciaIds: z.array(z.coerce.number().int().positive()).min(1, "Debe seleccionar al menos una transferencia"),
  totalTransferencias: z.coerce.number().positive(),
  totalUnidades: z.coerce.number().int().positive(),
  totalCUP: z.coerce.number().positive(),
  modoDistribucion: z.enum(["MANUAL", "AUTO"]),
  observaciones: z.string().max(500).optional().nullable(),
  lineas: z.array(
    z.object({
      fecha: z.coerce.date(),
      productoId: z.coerce.number().int().positive(),
      productoImportadoId: z.coerce.number().int().positive(),
      canal: z.enum(["USD", "FISCAL", "EFECTIVO"]),
      cantidad: z.coerce.number().int().positive(),
      precioUnitario: z.coerce.number().positive(),
      subtotal: z.coerce.number().positive(),
    })
  ),
});

export type CrearVentaConTransferenciasInput = z.infer<typeof crearVentaConTransferenciasSchema>;

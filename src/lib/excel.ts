import * as XLSX from "xlsx";

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExportOptions {
  sheetName?: string;
  columns: ExportColumn[];
}

/**
 * Genera un archivo Excel a partir de datos
 */
export function generateExcel<T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions
): Buffer {
  const { sheetName = "Datos", columns } = options;

  // Crear headers
  const headers = columns.map((col) => col.header);

  // Crear filas de datos
  const rows = data.map((item) =>
    columns.map((col) => {
      const value = item[col.key];
      // Formatear valores numéricos
      if (typeof value === "number") {
        return value;
      }
      if (value instanceof Date) {
        return value.toISOString().split("T")[0];
      }
      return value ?? "";
    })
  );

  // Crear worksheet
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Configurar anchos de columna
  ws["!cols"] = columns.map((col) => ({ wch: col.width ?? 15 }));

  // Crear workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Generar buffer
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

/**
 * Columnas para exportar importaciones
 */
export const columnasImportacion: ExportColumn[] = [
  { header: "Fecha", key: "fecha", width: 12 },
  { header: "Nro. Contenedor", key: "numeroContenedor", width: 15 },
  { header: "Importadora", key: "importadora", width: 15 },
  { header: "Producto", key: "producto", width: 25 },
  { header: "Cantidad", key: "cantidadUnidades", width: 12 },
  { header: "Importe USD", key: "importeUSD", width: 12 },
  { header: "Costo Unit. USD", key: "costoUnitarioUSD", width: 14 },
  { header: "Precio Venta USD", key: "precioVentaUSD", width: 14 },
  { header: "Precio Venta CUP", key: "precioVentaCUP", width: 14 },
  { header: "Tasa Cambio", key: "tasaCambio", width: 12 },
];

/**
 * Columnas para exportar inventario
 */
export const columnasInventario: ExportColumn[] = [
  { header: "Producto", key: "producto", width: 25 },
  { header: "Descripción", key: "descripcion", width: 20 },
  { header: "Stock Actual", key: "cantidadActual", width: 12 },
  { header: "Stock Mínimo", key: "cantidadMinima", width: 12 },
  { header: "Estado", key: "estado", width: 12 },
];

/**
 * Columnas para exportar productos
 */
export const columnasProductos: ExportColumn[] = [
  { header: "ID", key: "id", width: 8 },
  { header: "Nombre", key: "nombre", width: 25 },
  { header: "Descripción", key: "descripcion", width: 30 },
  { header: "Unidad de Medida", key: "unidadMedida", width: 15 },
  { header: "Activo", key: "activo", width: 10 },
];

/**
 * Genera nombre de archivo con fecha
 */
export function generateFileName(prefix: string): string {
  const date = new Date().toISOString().split("T")[0];
  return `${prefix}_${date}.xlsx`;
}

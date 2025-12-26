"use client";

import { useState } from "react";
import {
  DocumentArrowDownIcon,
  TruckIcon,
  CubeIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/outline";
import { Button, Input } from "@/components/ui";
import { useAlert } from "@/contexts/AlertContext";

type TipoReporte = "importaciones" | "inventario" | "productos";

interface ReporteConfig {
  tipo: TipoReporte;
  titulo: string;
  descripcion: string;
  icon: typeof TruckIcon;
  color: string;
  tieneRangoFechas: boolean;
}

const reportes: ReporteConfig[] = [
  {
    tipo: "importaciones",
    titulo: "Reporte de Importaciones",
    descripcion: "Exporta todas las importaciones con detalle de productos, costos y precios calculados",
    icon: TruckIcon,
    color: "text-primary",
    tieneRangoFechas: true,
  },
  {
    tipo: "inventario",
    titulo: "Reporte de Inventario",
    descripcion: "Stock actual de todos los productos con estado de existencias",
    icon: ArchiveBoxIcon,
    color: "text-purple-600",
    tieneRangoFechas: false,
  },
  {
    tipo: "productos",
    titulo: "Catálogo de Productos",
    descripcion: "Lista completa de productos registrados en el sistema",
    icon: CubeIcon,
    color: "text-info",
    tieneRangoFechas: false,
  },
];

export default function ReportesPage() {
  const { showAlert } = useAlert();
  const [descargando, setDescargando] = useState<TipoReporte | null>(null);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const handleDescargar = async (tipo: TipoReporte) => {
    setDescargando(tipo);

    try {
      const params = new URLSearchParams({ tipo });
      if (tipo === "importaciones") {
        if (fechaDesde) params.append("fechaDesde", fechaDesde);
        if (fechaHasta) params.append("fechaHasta", fechaHasta);
      }

      const response = await fetch(`/api/reportes?${params}`);

      if (!response.ok) {
        throw new Error("Error al generar reporte");
      }

      // Obtener el blob y descargar
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Obtener nombre del archivo del header
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `reporte_${tipo}.xlsx`;

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error:", error);
      showAlert({
        type: "error",
        title: "Error",
        message: "Error al generar el reporte",
      });
    } finally {
      setDescargando(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
        <p className="text-sm text-muted">
          Genera y descarga reportes en formato Excel
        </p>
      </div>

      {/* Filtro de fechas para importaciones */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Filtros</h2>
        <p className="text-sm text-muted mb-4">
          Estos filtros aplican al reporte de importaciones
        </p>
        <div className="flex flex-wrap gap-4">
          <div className="w-48">
            <Input
              label="Desde"
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </div>
          <div className="w-48">
            <Input
              label="Hasta"
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </div>
          {(fechaDesde || fechaHasta) && (
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFechaDesde("");
                  setFechaHasta("");
                }}
              >
                Limpiar
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Lista de reportes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportes.map((reporte) => {
          const Icon = reporte.icon;
          const isLoading = descargando === reporte.tipo;

          return (
            <div key={reporte.tipo} className="card flex flex-col">
              <div className="flex items-start gap-4 mb-4">
                <div className={`p-3 rounded-lg bg-surface-hover ${reporte.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{reporte.titulo}</h3>
                  <p className="text-sm text-muted mt-1">{reporte.descripcion}</p>
                </div>
              </div>

              {reporte.tieneRangoFechas && (fechaDesde || fechaHasta) && (
                <p className="text-xs text-muted mb-4">
                  Filtrado: {fechaDesde || "Inicio"} - {fechaHasta || "Hoy"}
                </p>
              )}

              <div className="mt-auto">
                <Button
                  onClick={() => handleDescargar(reporte.tipo)}
                  loading={isLoading}
                  className="w-full"
                  variant="secondary"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  {isLoading ? "Generando..." : "Descargar Excel"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info adicional */}
      <div className="card bg-primary-light border-primary/20">
        <h3 className="font-semibold text-primary mb-2">Sobre los reportes</h3>
        <ul className="text-sm text-secondary space-y-1">
          <li>• Los archivos se generan en formato Excel (.xlsx)</li>
          <li>• El reporte de importaciones incluye los cálculos de precios</li>
          <li>• El inventario muestra el estado actual (Sin Stock, Stock Bajo, OK)</li>
          <li>• Puedes abrir los archivos en Excel, Google Sheets o LibreOffice</li>
        </ul>
      </div>
    </div>
  );
}

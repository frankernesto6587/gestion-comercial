import { NextRequest, NextResponse } from "next/server";
import { isDatabaseError, databaseUnavailableResponse } from "@/lib/db";
import { obtenerProductosConStock } from "@/lib/ventas";

// GET /api/ventas/productos-stock - Obtener productos con stock disponible
// Query params:
//   - fechaFin: (opcional) Fecha límite para calcular stock histórico
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaFinStr = searchParams.get("fechaFin");

    // Convertir a Date si se proporciona
    const fechaFin = fechaFinStr ? new Date(fechaFinStr) : undefined;

    const productos = await obtenerProductosConStock(fechaFin);

    return NextResponse.json(productos);
  } catch (error) {
    console.error("Error al obtener productos con stock:", error);

    if (isDatabaseError(error)) {
      return databaseUnavailableResponse();
    }

    return NextResponse.json(
      { error: "Error al obtener productos" },
      { status: 500 }
    );
  }
}

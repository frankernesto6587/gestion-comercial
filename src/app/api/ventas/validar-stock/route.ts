import { NextRequest, NextResponse } from "next/server";
import { isDatabaseError, databaseUnavailableResponse } from "@/lib/db";
import { validarStockParaVenta } from "@/lib/ventas";
import { z } from "zod";

// Schema para validación previa de stock
const validarStockSchema = z.object({
  fechaFin: z.coerce.date(),
  totalTransferencias: z.coerce.number().positive("El total de transferencias debe ser mayor a 0"),
  productos: z.array(
    z.object({
      productoId: z.coerce.number().int().positive(),
      porcentaje: z.coerce.number().min(0).max(100),
    })
  ).min(1, "Debe seleccionar al menos un producto"),
});

// POST /api/ventas/validar-stock - Validar stock ANTES de calcular distribución
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = validarStockSchema.parse(body);

    // Validar que los porcentajes sumen aproximadamente 100%
    const totalPorcentaje = validatedData.productos.reduce((sum, p) => sum + p.porcentaje, 0);
    if (Math.abs(totalPorcentaje - 100) > 0.1) {
      return NextResponse.json(
        {
          valido: false,
          errores: [`Los porcentajes deben sumar 100% (actualmente: ${totalPorcentaje.toFixed(2)}%)`],
          detalles: [],
          totalTransferenciasCubiertas: 0
        },
        { status: 200 } // Retornamos 200 pero con valido: false
      );
    }

    // Ejecutar validación
    const resultado = await validarStockParaVenta(
      validatedData.fechaFin,
      validatedData.totalTransferencias,
      validatedData.productos
    );

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Error al validar stock:", error);

    if (isDatabaseError(error)) {
      return databaseUnavailableResponse();
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          valido: false,
          errores: error.issues.map(i => i.message),
          detalles: [],
          totalTransferenciasCubiertas: 0
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: "Error al validar stock" },
      { status: 500 }
    );
  }
}

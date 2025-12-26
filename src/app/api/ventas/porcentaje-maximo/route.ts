import { NextRequest, NextResponse } from "next/server";
import { isDatabaseError, databaseUnavailableResponse } from "@/lib/db";
import { calcularPorcentajeMaximo } from "@/lib/ventas";
import { z } from "zod";

const schema = z.object({
  productoId: z.coerce.number().int().positive(),
  fechaFin: z.coerce.date(),
  totalTransferencias: z.coerce.number().positive(),
});

// POST /api/ventas/porcentaje-maximo - Calcular porcentaje máximo por producto
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productoId, fechaFin, totalTransferencias } = schema.parse(body);

    const resultado = await calcularPorcentajeMaximo(
      productoId,
      fechaFin,
      totalTransferencias
    );

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Error al calcular porcentaje máximo:", error);

    if (isDatabaseError(error)) {
      return databaseUnavailableResponse();
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error al calcular porcentaje máximo" },
      { status: 500 }
    );
  }
}

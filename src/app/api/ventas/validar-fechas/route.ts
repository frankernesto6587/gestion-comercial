import { NextRequest, NextResponse } from "next/server";
import { isDatabaseError, databaseUnavailableResponse } from "@/lib/db";
import { validarFechasTransferencias } from "@/lib/ventas";
import { z } from "zod";

// Schema para validación de fechas
const validarFechasSchema = z.object({
  fechaFin: z.coerce.date(),
  transferencias: z.array(
    z.object({
      fecha: z.coerce.date(),
      monto: z.coerce.number().positive(),
    })
  ).min(1, "Debe seleccionar al menos una transferencia"),
  productos: z.array(
    z.object({
      productoId: z.coerce.number().int().positive(),
      porcentaje: z.coerce.number().min(0).max(100),
    })
  ).min(1, "Debe seleccionar al menos un producto"),
});

// POST /api/ventas/validar-fechas - Validar conflictos de fechas transferencia vs importación
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = validarFechasSchema.parse(body);

    // Ejecutar validación
    const resultado = await validarFechasTransferencias(
      validatedData.transferencias,
      validatedData.productos,
      validatedData.fechaFin
    );

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Error al validar fechas:", error);

    if (isDatabaseError(error)) {
      return databaseUnavailableResponse();
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          valido: false,
          conflictos: [],
          error: error.issues.map(i => i.message).join(", ")
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error al validar fechas" },
      { status: 500 }
    );
  }
}

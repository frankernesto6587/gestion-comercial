import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const tipoGastoSchema = z.object({
  nombre: z.string().min(1).max(100),
  descripcion: z.string().max(255).optional().nullable(),
  activo: z.boolean().default(true),
});

// GET /api/tipos-gasto - Listar tipos de gasto
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const activo = searchParams.get("activo");

    const where = activo !== null && activo !== ""
      ? { activo: activo === "true" }
      : {};

    const tiposGasto = await prisma.tipoGasto.findMany({
      where,
      orderBy: { nombre: "asc" },
    });

    return NextResponse.json(tiposGasto);
  } catch (error) {
    console.error("Error al obtener tipos de gasto:", error);
    return NextResponse.json(
      { error: "Error al obtener tipos de gasto" },
      { status: 500 }
    );
  }
}

// POST /api/tipos-gasto - Crear tipo de gasto
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = tipoGastoSchema.parse(body);

    const tipoGasto = await prisma.tipoGasto.create({
      data: validatedData,
    });

    return NextResponse.json(tipoGasto, { status: 201 });
  } catch (error) {
    console.error("Error al crear tipo de gasto:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error al crear tipo de gasto" },
      { status: 500 }
    );
  }
}

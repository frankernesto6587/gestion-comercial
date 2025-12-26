import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseError, databaseUnavailableResponse } from "@/lib/db";
import { recalcularImportacionPorId } from "@/lib/recalcular";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const gastoSchema = z.object({
  tipoGastoId: z.number().positive(),
  monedaId: z.number().positive(),
  monto: z.number().positive(),
  descripcion: z.string().optional(),
});

// POST /api/importaciones/[id]/gastos - Agregar gasto
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const importacionId = parseInt(id);

    if (isNaN(importacionId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar que la importación existe
    const importacion = await prisma.importacion.findUnique({
      where: { id: importacionId },
    });

    if (!importacion) {
      return NextResponse.json({ error: "Importación no encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = gastoSchema.parse(body);

    // Crear el gasto y recalcular en transacción
    const resultado = await prisma.$transaction(async (tx) => {
      // Crear el gasto
      const gasto = await tx.gastoContenedor.create({
        data: {
          importacionId,
          tipoGastoId: validatedData.tipoGastoId,
          monedaId: validatedData.monedaId,
          monto: validatedData.monto,
          descripcion: validatedData.descripcion || null,
        },
        include: {
          tipoGasto: true,
          moneda: true,
        },
      });

      return gasto;
    });

    // Recalcular todos los productos con prorrateo por inversión
    await recalcularImportacionPorId(prisma, importacionId);

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    console.error("Error al agregar gasto:", error);

    if (isDatabaseError(error)) {
      return databaseUnavailableResponse();
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Error al agregar gasto" }, { status: 500 });
  }
}

// GET /api/importaciones/[id]/gastos - Listar gastos
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const importacionId = parseInt(id);

    if (isNaN(importacionId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const gastos = await prisma.gastoContenedor.findMany({
      where: { importacionId },
      include: {
        tipoGasto: true,
        moneda: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(gastos);
  } catch (error) {
    console.error("Error al obtener gastos:", error);

    if (isDatabaseError(error)) {
      return databaseUnavailableResponse();
    }

    return NextResponse.json({ error: "Error al obtener gastos" }, { status: 500 });
  }
}

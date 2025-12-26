import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseError, databaseUnavailableResponse } from "@/lib/db";
import { recalcularImportacionPorId } from "@/lib/recalcular";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Schema de validación para actualizar tasas de cambio
const actualizarTasasSchema = z.object({
  tasas: z.array(
    z.object({
      monedaId: z.number().positive("ID de moneda inválido"),
      tasaCambio: z.number().positive("La tasa debe ser mayor a 0"),
    })
  ).min(1, "Debe incluir al menos una tasa de cambio"),
});

// GET /api/importaciones/[id]/tasas-cambio - Obtener tasas de cambio
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const importacionId = parseInt(id);

    if (isNaN(importacionId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const tasasCambio = await prisma.tasaCambioContenedor.findMany({
      where: { importacionId },
      include: {
        moneda: true,
      },
      orderBy: { moneda: { codigo: "asc" } },
    });

    return NextResponse.json(tasasCambio);
  } catch (error) {
    console.error("Error al obtener tasas de cambio:", error);

    if (isDatabaseError(error)) {
      return databaseUnavailableResponse();
    }

    return NextResponse.json(
      { error: "Error al obtener tasas de cambio" },
      { status: 500 }
    );
  }
}

// PATCH /api/importaciones/[id]/tasas-cambio - Actualizar tasas de cambio
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const importacionId = parseInt(id);

    if (isNaN(importacionId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();

    // Validar datos de entrada
    const validacion = actualizarTasasSchema.safeParse(body);
    if (!validacion.success) {
      return NextResponse.json(
        { error: "Datos inválidos", detalles: validacion.error.issues },
        { status: 400 }
      );
    }

    const { tasas } = validacion.data;

    // Verificar que la importación existe
    const importacion = await prisma.importacion.findUnique({
      where: { id: importacionId },
    });

    if (!importacion) {
      return NextResponse.json(
        { error: "Importación no encontrada" },
        { status: 404 }
      );
    }

    // Verificar que USD está incluido (es obligatorio)
    const monedaUSD = await prisma.moneda.findFirst({
      where: { codigo: "USD" },
    });

    if (monedaUSD) {
      const tieneUSD = tasas.some((t) => t.monedaId === monedaUSD.id);
      if (!tieneUSD) {
        return NextResponse.json(
          { error: "La tasa de cambio USD es obligatoria" },
          { status: 400 }
        );
      }
    }

    // Actualizar tasas en transacción
    await prisma.$transaction(async (tx) => {
      // Upsert cada tasa (crear si no existe, actualizar si existe)
      for (const tasa of tasas) {
        await tx.tasaCambioContenedor.upsert({
          where: {
            importacionId_monedaId: {
              importacionId,
              monedaId: tasa.monedaId,
            },
          },
          update: {
            tasaCambio: tasa.tasaCambio,
          },
          create: {
            importacionId,
            monedaId: tasa.monedaId,
            tasaCambio: tasa.tasaCambio,
          },
        });
      }

      // Recalcular todos los productos con las nuevas tasas
      await recalcularImportacionPorId(tx, importacionId);
    });

    // Obtener las tasas actualizadas para retornar
    const tasasActualizadas = await prisma.tasaCambioContenedor.findMany({
      where: { importacionId },
      include: { moneda: true },
    });

    return NextResponse.json({
      message: "Tasas de cambio actualizadas correctamente",
      tasasCambio: tasasActualizadas,
    });
  } catch (error) {
    console.error("Error al actualizar tasas de cambio:", error);

    if (isDatabaseError(error)) {
      return databaseUnavailableResponse();
    }

    return NextResponse.json(
      { error: "Error al actualizar tasas de cambio" },
      { status: 500 }
    );
  }
}

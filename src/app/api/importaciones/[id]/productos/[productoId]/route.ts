import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseError, databaseUnavailableResponse } from "@/lib/db";
import { recalcularImportacionPorId } from "@/lib/recalcular";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string; productoId: string }>;
}

// Schema de validación para actualizar producto importado
const actualizarProductoSchema = z.object({
  cantidadUnidades: z.number().int().positive("La cantidad debe ser mayor a 0").optional(),
  precioUnitarioUSD: z.number().positive("El precio debe ser mayor a 0").optional(),
  porcentajeMerma: z.number().min(0).max(100, "El porcentaje debe estar entre 0 y 100").optional(),
  margenUtilidad: z.number().min(0).max(100, "El porcentaje debe estar entre 0 y 100").optional(),
  mediaPrecioFiscal: z.number().min(0, "El precio debe ser mayor o igual a 0").optional(),
  mediaPrecioFiscalEfectivo: z.number().min(0, "El precio debe ser mayor o igual a 0").optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "Debe proporcionar al menos un campo para actualizar" }
);

// GET /api/importaciones/[id]/productos/[productoId] - Obtener producto
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, productoId } = await params;
    const importacionId = parseInt(id);
    const productoIdNum = parseInt(productoId);

    if (isNaN(importacionId) || isNaN(productoIdNum)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const producto = await prisma.productoImportado.findFirst({
      where: {
        id: productoIdNum,
        importacionId,
      },
      include: {
        producto: true,
      },
    });

    if (!producto) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(producto);
  } catch (error) {
    console.error("Error al obtener producto:", error);

    if (isDatabaseError(error)) {
      return databaseUnavailableResponse();
    }

    return NextResponse.json(
      { error: "Error al obtener producto" },
      { status: 500 }
    );
  }
}

// PATCH /api/importaciones/[id]/productos/[productoId] - Actualizar producto
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, productoId } = await params;
    const importacionId = parseInt(id);
    const productoIdNum = parseInt(productoId);

    if (isNaN(importacionId) || isNaN(productoIdNum)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();

    // Validar datos de entrada
    const validacion = actualizarProductoSchema.safeParse(body);
    if (!validacion.success) {
      return NextResponse.json(
        { error: "Datos inválidos", detalles: validacion.error.issues },
        { status: 400 }
      );
    }

    const datos = validacion.data;

    // Verificar que el producto existe y pertenece a la importación
    const productoExistente = await prisma.productoImportado.findFirst({
      where: {
        id: productoIdNum,
        importacionId,
      },
    });

    if (!productoExistente) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    // Preparar datos para actualización
    const datosActualizacion: Record<string, number> = {};

    // Si se actualiza cantidad o precio, recalcular importeUSD
    let cantidadFinal = productoExistente.cantidadUnidades;
    let precioFinal = productoExistente.precioUnitarioUSD
      ? Number(productoExistente.precioUnitarioUSD)
      : Number(productoExistente.importeUSD) / productoExistente.cantidadUnidades;

    if (datos.cantidadUnidades !== undefined) {
      cantidadFinal = datos.cantidadUnidades;
      datosActualizacion.cantidadUnidades = datos.cantidadUnidades;
    }

    if (datos.precioUnitarioUSD !== undefined) {
      precioFinal = datos.precioUnitarioUSD;
      datosActualizacion.precioUnitarioUSD = datos.precioUnitarioUSD;
    }

    // Siempre recalcular importeUSD si cambia cantidad o precio
    if (datos.cantidadUnidades !== undefined || datos.precioUnitarioUSD !== undefined) {
      datosActualizacion.importeUSD = cantidadFinal * precioFinal;
    }

    // Otros campos opcionales
    if (datos.porcentajeMerma !== undefined) {
      datosActualizacion.porcentajeMerma = datos.porcentajeMerma;
    }

    if (datos.margenUtilidad !== undefined) {
      datosActualizacion.margenUtilidad = datos.margenUtilidad;
    }

    if (datos.mediaPrecioFiscal !== undefined) {
      datosActualizacion.mediaPrecioFiscal = datos.mediaPrecioFiscal;
    }

    if (datos.mediaPrecioFiscalEfectivo !== undefined) {
      datosActualizacion.mediaPrecioFiscalEfectivo = datos.mediaPrecioFiscalEfectivo;
    }

    // Actualizar en transacción
    await prisma.$transaction(async (tx) => {
      // Actualizar el producto
      await tx.productoImportado.update({
        where: { id: productoIdNum },
        data: datosActualizacion,
      });

      // Recalcular todos los productos (porque el cambio puede afectar el prorrateo)
      await recalcularImportacionPorId(tx, importacionId);
    });

    // Obtener el producto actualizado
    const productoActualizado = await prisma.productoImportado.findUnique({
      where: { id: productoIdNum },
      include: { producto: true },
    });

    return NextResponse.json({
      message: "Producto actualizado correctamente",
      producto: productoActualizado,
    });
  } catch (error) {
    console.error("Error al actualizar producto:", error);

    if (isDatabaseError(error)) {
      return databaseUnavailableResponse();
    }

    return NextResponse.json(
      { error: "Error al actualizar producto" },
      { status: 500 }
    );
  }
}

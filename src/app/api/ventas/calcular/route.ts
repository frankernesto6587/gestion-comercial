import { NextRequest, NextResponse } from "next/server";
import { isDatabaseError, databaseUnavailableResponse } from "@/lib/db";
import { calcularVentaSchema } from "@/lib/validations";
import {
  calcularDistribucion,
  validarStock,
  calcularTotalesPorProducto,
} from "@/lib/ventas";
import { z } from "zod";

// POST /api/ventas/calcular - Calcular preview de distribución
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = calcularVentaSchema.parse(body);

    // Convertir fechas
    const fechaInicio = new Date(validatedData.fechaInicio);
    const fechaFin = new Date(validatedData.fechaFin);

    // Validar que fecha fin >= fecha inicio
    if (fechaFin < fechaInicio) {
      return NextResponse.json(
        { error: "La fecha fin debe ser mayor o igual a la fecha inicio" },
        { status: 400 }
      );
    }

    // Convertir transferencias
    const transferencias = validatedData.transferencias.map((t) => ({
      fecha: new Date(t.fecha),
      monto: t.monto,
    }));

    // Validar que las transferencias estén dentro del período
    for (const t of transferencias) {
      if (t.fecha < fechaInicio || t.fecha > fechaFin) {
        return NextResponse.json(
          {
            error: `La transferencia del ${t.fecha.toLocaleDateString()} está fuera del período`,
          },
          { status: 400 }
        );
      }
    }

    // Calcular distribución
    const distribucion = await calcularDistribucion(
      fechaInicio,
      fechaFin,
      transferencias,
      validatedData.productos,
      validatedData.modoDistribucion,
      validatedData.permitirReasignacionFiscal ?? false
    );

    // Validar stock usando el stock histórico en la fecha fin
    const validacionStock = await validarStock(
      distribucion.distribucionPorProducto,
      fechaFin
    );

    // Calcular totales por producto
    const totales = calcularTotalesPorProducto(distribucion.lineasVenta);

    return NextResponse.json({
      ...distribucion,
      validacionStock,
      totalesPorProducto: totales.porProducto,
      totalesGenerales: totales.totales,
    });
  } catch (error) {
    console.error("Error al calcular distribución:", error);

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
      { error: "Error al calcular distribución" },
      { status: 500 }
    );
  }
}

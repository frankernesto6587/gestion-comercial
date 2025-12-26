import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseError, databaseUnavailableResponse } from "@/lib/db";
import { transferenciaSchema } from "@/lib/validations";

// GET /api/transferencias - Listar transferencias con filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const disponibles = searchParams.get("disponibles");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: {
      fecha?: { gte?: Date; lte?: Date };
      ventaId?: null | { not: null };
    } = {};

    // Filtro por rango de fechas
    if (fechaDesde || fechaHasta) {
      where.fecha = {};
      if (fechaDesde) {
        where.fecha.gte = new Date(fechaDesde);
      }
      if (fechaHasta) {
        // Incluir todo el día
        const hasta = new Date(fechaHasta);
        hasta.setHours(23, 59, 59, 999);
        where.fecha.lte = hasta;
      }
    }

    // Filtro por disponibilidad
    if (disponibles === "true") {
      where.ventaId = null;
    } else if (disponibles === "false") {
      where.ventaId = { not: null };
    }

    const [transferencias, total, agregado] = await Promise.all([
      prisma.transferencia.findMany({
        where,
        include: {
          venta: {
            select: {
              id: true,
              fechaInicio: true,
              fechaFin: true,
            },
          },
        },
        orderBy: { fecha: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transferencia.count({ where }),
      prisma.transferencia.aggregate({
        where,
        _sum: { monto: true },
      }),
    ]);

    return NextResponse.json({
      data: transferencias,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      totalMonto: agregado._sum.monto?.toString() || "0",
    });
  } catch (error) {
    console.error("Error al obtener transferencias:", error);

    if (isDatabaseError(error)) {
      return databaseUnavailableResponse();
    }

    return NextResponse.json(
      { error: "Error al obtener transferencias" },
      { status: 500 }
    );
  }
}

// POST /api/transferencias - Crear transferencia individual
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar datos
    const result = transferenciaSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { fecha, monto, refOrigen, refCorriente, ordenante } = result.data;

    // Verificar que refOrigen no esté duplicada (si se proporciona)
    if (refOrigen) {
      const existente = await prisma.transferencia.findUnique({
        where: { refOrigen },
        select: { id: true },
      });

      if (existente) {
        return NextResponse.json(
          { error: `Ya existe una transferencia con la referencia de origen: ${refOrigen}` },
          { status: 400 }
        );
      }
    }

    const transferencia = await prisma.transferencia.create({
      data: {
        fecha,
        monto,
        refOrigen: refOrigen || null,
        refCorriente: refCorriente || null,
        ordenante: ordenante || null,
      },
    });

    return NextResponse.json(transferencia, { status: 201 });
  } catch (error) {
    console.error("Error al crear transferencia:", error);

    if (isDatabaseError(error)) {
      return databaseUnavailableResponse();
    }

    return NextResponse.json(
      { error: "Error al crear transferencia" },
      { status: 500 }
    );
  }
}

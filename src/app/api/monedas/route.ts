import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const monedaSchema = z.object({
  codigo: z.string().min(1).max(10),
  nombre: z.string().min(1).max(100),
  simbolo: z.string().min(1).max(5).default("$"),
  tasaDefecto: z.coerce.number().positive(),
  activo: z.boolean().default(true),
});

// GET /api/monedas - Listar monedas
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const activo = searchParams.get("activo");

    const where = activo !== null && activo !== ""
      ? { activo: activo === "true" }
      : {};

    const monedas = await prisma.moneda.findMany({
      where,
      orderBy: { codigo: "asc" },
    });

    return NextResponse.json(monedas);
  } catch (error) {
    console.error("Error al obtener monedas:", error);
    return NextResponse.json(
      { error: "Error al obtener monedas" },
      { status: 500 }
    );
  }
}

// POST /api/monedas - Crear moneda
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = monedaSchema.parse(body);

    const moneda = await prisma.moneda.create({
      data: validatedData,
    });

    return NextResponse.json(moneda, { status: 201 });
  } catch (error) {
    console.error("Error al crear moneda:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error al crear moneda" },
      { status: 500 }
    );
  }
}

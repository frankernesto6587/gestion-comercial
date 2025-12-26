import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { productoSchema } from "@/lib/validations";

// GET /api/productos - Listar productos
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const busqueda = searchParams.get("busqueda") || "";
    const activo = searchParams.get("activo");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const where = {
      AND: [
        busqueda
          ? {
              OR: [
                { nombre: { contains: busqueda, mode: "insensitive" as const } },
                { descripcion: { contains: busqueda, mode: "insensitive" as const } },
              ],
            }
          : {},
        activo !== null && activo !== "" ? { activo: activo === "true" } : {},
      ],
    };

    const [productos, total] = await Promise.all([
      prisma.producto.findMany({
        where,
        orderBy: { nombre: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          inventario: {
            select: {
              cantidadActual: true,
              cantidadMinima: true,
            },
          },
        },
      }),
      prisma.producto.count({ where }),
    ]);

    return NextResponse.json({
      data: productos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error al obtener productos:", error);
    return NextResponse.json(
      { error: "Error al obtener productos" },
      { status: 500 }
    );
  }
}

// POST /api/productos - Crear producto
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = productoSchema.parse(body);

    const producto = await prisma.producto.create({
      data: validatedData,
    });

    // Crear inventario inicial para el producto
    await prisma.inventario.create({
      data: {
        productoId: producto.id,
        cantidadActual: 0,
        cantidadMinima: 0,
      },
    });

    return NextResponse.json(producto, { status: 201 });
  } catch (error) {
    console.error("Error al crear producto:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error al crear producto" },
      { status: 500 }
    );
  }
}

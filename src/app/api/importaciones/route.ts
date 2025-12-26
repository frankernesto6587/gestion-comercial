import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseError, databaseUnavailableResponse } from "@/lib/db";
import {
  importacionSchema,
  productoImportadoSchema,
  tasaCambioContenedorSchema,
  gastoContenedorSchema,
} from "@/lib/validations";
import { calcularPrecios } from "@/lib/calculations";
import { z } from "zod";

// GET /api/importaciones - Listar importaciones
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const importadora = searchParams.get("importadora") || "";
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");

    const where = {
      AND: [
        importadora
          ? { importadora: { nombre: { contains: importadora, mode: "insensitive" as const } } }
          : {},
        fechaDesde ? { fecha: { gte: new Date(fechaDesde) } } : {},
        fechaHasta ? { fecha: { lte: new Date(fechaHasta) } } : {},
      ],
    };

    const [importaciones, total] = await Promise.all([
      prisma.importacion.findMany({
        where,
        orderBy: { fecha: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          importadora: true,
          proveedor: true,
          productos: {
            include: {
              producto: true,
            },
          },
          gastos: {
            include: {
              tipoGasto: true,
              moneda: true,
            },
          },
          tasasCambio: {
            include: {
              moneda: true,
            },
          },
        },
      }),
      prisma.importacion.count({ where }),
    ]);

    // Calcular totales para cada importación
    const importacionesConTotales = importaciones.map((imp) => {
      const totalUSD = imp.productos.reduce(
        (sum, p) => sum + Number(p.importeUSD),
        0
      );
      const totalUnidades = imp.productos.reduce(
        (sum, p) => sum + p.cantidadUnidades,
        0
      );

      // Calcular total de gastos en CUP
      let totalGastosCUP = 0;
      for (const gasto of imp.gastos) {
        const tasaGasto = imp.tasasCambio.find(
          (t) => t.monedaId === gasto.monedaId
        );
        const tasaMoneda = tasaGasto
          ? Number(tasaGasto.tasaCambio)
          : Number(gasto.moneda.tasaDefecto);
        totalGastosCUP += Number(gasto.monto) * tasaMoneda;
      }

      return {
        ...imp,
        totalUSD,
        totalUnidades,
        totalGastosCUP,
        cantidadProductos: imp.productos.length,
      };
    });

    return NextResponse.json({
      data: importacionesConTotales,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error al obtener importaciones:", error);

    if (isDatabaseError(error)) {
      return databaseUnavailableResponse();
    }

    return NextResponse.json(
      { error: "Error al obtener importaciones" },
      { status: 500 }
    );
  }
}

// Schema para crear importación con productos, gastos y tasas de cambio
const crearImportacionSchema = z.object({
  importacion: importacionSchema,
  productos: z.array(productoImportadoSchema).min(1, "Debe agregar al menos un producto"),
  tasasCambio: z.array(tasaCambioContenedorSchema).optional().default([]),
  gastos: z.array(gastoContenedorSchema).optional().default([]),
});

// POST /api/importaciones - Crear importación con productos, gastos y tasas
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = crearImportacionSchema.parse(body);

    // Crear importación y todos los registros relacionados en una transacción
    const resultado = await prisma.$transaction(async (tx) => {
      // Crear la importación
      const importacion = await tx.importacion.create({
        data: validatedData.importacion,
      });

      // Crear las tasas de cambio del contenedor
      if (validatedData.tasasCambio.length > 0) {
        await tx.tasaCambioContenedor.createMany({
          data: validatedData.tasasCambio.map((tasa) => ({
            importacionId: importacion.id,
            monedaId: tasa.monedaId,
            tasaCambio: tasa.tasaCambio,
          })),
        });
      }

      // Crear los gastos del contenedor
      if (validatedData.gastos.length > 0) {
        await tx.gastoContenedor.createMany({
          data: validatedData.gastos.map((gasto) => ({
            importacionId: importacion.id,
            tipoGastoId: gasto.tipoGastoId,
            monedaId: gasto.monedaId,
            monto: gasto.monto,
            descripcion: gasto.descripcion,
          })),
        });
      }

      // Obtener gastos y tasas creados para calcular totales
      const gastosCreados = await tx.gastoContenedor.findMany({
        where: { importacionId: importacion.id },
        include: { moneda: true },
      });

      const tasasCreadas = await tx.tasaCambioContenedor.findMany({
        where: { importacionId: importacion.id },
        include: { moneda: true },
      });

      // Obtener tasa de cambio USD
      const tasaUSD = tasasCreadas.find((t) => t.moneda.codigo === "USD");
      const tasaCambioUSD = tasaUSD ? Number(tasaUSD.tasaCambio) : 320;

      // Calcular total de gastos en CUP
      let totalGastosCUP = 0;
      for (const gasto of gastosCreados) {
        const tasaGasto = tasasCreadas.find((t) => t.monedaId === gasto.monedaId);
        const tasaMoneda = tasaGasto
          ? Number(tasaGasto.tasaCambio)
          : Number(gasto.moneda.tasaDefecto);
        totalGastosCUP += Number(gasto.monto) * tasaMoneda;
      }

      // Calcular total de importe USD para prorrateo por inversión (no por cantidad)
      const totalImporteUSD = validatedData.productos.reduce(
        (sum, p) => sum + (p.precioUnitarioUSD * p.cantidadUnidades),
        0
      );

      // Crear los productos importados con cálculos
      const productosCreados = await Promise.all(
        validatedData.productos.map(async (prod) => {
          // Calcular importe total del producto = precioUnitario * cantidad
          const importeUSD = prod.precioUnitarioUSD * prod.cantidadUnidades;

          // Prorratear gastos por inversión (% que representa del total de la factura)
          const proporcion = totalImporteUSD > 0 ? importeUSD / totalImporteUSD : 0;
          const gastosPorrateados = totalGastosCUP * proporcion;

          // Calcular precios
          const calculos = calcularPrecios({
            cantidadUnidades: prod.cantidadUnidades,
            importeUSD: importeUSD,
            gastosPorrateadosCUP: gastosPorrateados,
            porcentajeMerma: prod.porcentajeMerma,
            margenUtilidad: prod.margenUtilidad,
            tasaCambio: tasaCambioUSD,
          });

          // Crear producto importado
          const productoImportado = await tx.productoImportado.create({
            data: {
              importacionId: importacion.id,
              productoId: prod.productoId,
              cantidadUnidades: prod.cantidadUnidades,
              precioUnitarioUSD: prod.precioUnitarioUSD,
              importeUSD: importeUSD,
              porcentajeMerma: prod.porcentajeMerma ?? 2,
              margenUtilidad: prod.margenUtilidad ?? 15,
              mediaPrecioFiscal: prod.mediaPrecioFiscal ?? 173,
              mediaPrecioFiscalEfectivo: prod.mediaPrecioFiscalEfectivo ?? 173,
              ventaRealEstimada: prod.ventaRealEstimada ?? null,
              costoUnitarioUSD: calculos.costoUnitarioUSD.toNumber(),
              precioVentaUSD: calculos.precioVentaUSD.toNumber(),
              precioVentaCUP: calculos.precioVentaCUP.toNumber(),
            },
          });

          // Actualizar inventario (agregar entrada)
          const inventario = await tx.inventario.findUnique({
            where: { productoId: prod.productoId },
          });

          if (inventario) {
            await tx.inventario.update({
              where: { id: inventario.id },
              data: {
                cantidadActual: {
                  increment: prod.cantidadUnidades,
                },
              },
            });

            // Registrar movimiento de entrada con la fecha de la importación
            await tx.movimientoInventario.create({
              data: {
                inventarioId: inventario.id,
                tipo: "ENTRADA",
                cantidad: prod.cantidadUnidades,
                motivo: "Importación",
                referencia: `Importación #${importacion.id}`,
                fecha: importacion.fecha,
              },
            });
          }

          return productoImportado;
        })
      );

      return {
        importacion,
        productos: productosCreados,
        gastos: gastosCreados,
        tasasCambio: tasasCreadas,
      };
    });

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    console.error("Error al crear importación:", error);

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
      { error: "Error al crear importación" },
      { status: 500 }
    );
  }
}

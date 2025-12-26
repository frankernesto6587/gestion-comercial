-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ENTRADA', 'SALIDA', 'MERMA', 'AJUSTE_POS', 'AJUSTE_NEG');

-- CreateTable
CREATE TABLE "productos" (
    "id" SERIAL NOT NULL,
    "codefref" INTEGER,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "unidadMedida" TEXT NOT NULL DEFAULT 'unidad',
    "pack" INTEGER NOT NULL DEFAULT 24,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "importadoras" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "importadoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedores" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "importaciones" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "numeroContenedor" TEXT,
    "importadoraId" INTEGER NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "porcentajeAporteMasMargen" DECIMAL(8,4) NOT NULL DEFAULT 15,
    "porcentajeMargenComercial" DECIMAL(8,4) NOT NULL DEFAULT 85,
    "porcentajeMargenUtilidad" DECIMAL(8,4) NOT NULL DEFAULT 4,
    "porcentajeMerma" DECIMAL(8,4) NOT NULL DEFAULT 2,
    "porcentajeVentaEfectivo" DECIMAL(8,4) NOT NULL DEFAULT 4,
    "porcentajeVentaFiscal" DECIMAL(8,4) NOT NULL DEFAULT 5,
    "porcentajeVentaUSD" DECIMAL(8,4) NOT NULL DEFAULT 91,
    "porcentajeOtrosGastos" DECIMAL(8,4) NOT NULL DEFAULT 10,

    CONSTRAINT "importaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos_importados" (
    "id" SERIAL NOT NULL,
    "importacionId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "cantidadUnidades" INTEGER NOT NULL,
    "precioUnitarioUSD" DECIMAL(14,4),
    "importeUSD" DECIMAL(14,4) NOT NULL,
    "porcentajeMerma" DECIMAL(8,4) NOT NULL DEFAULT 2,
    "margenUtilidad" DECIMAL(8,4) NOT NULL DEFAULT 15,
    "costoUnitarioUSD" DECIMAL(14,4),
    "precioVentaUSD" DECIMAL(14,4),
    "precioVentaCUP" DECIMAL(14,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "mediaPrecioFiscal" DECIMAL(14,4) NOT NULL DEFAULT 173,
    "mediaPrecioFiscalEfectivo" DECIMAL(14,4) NOT NULL DEFAULT 173,
    "ventaRealEstimada" DECIMAL(14,4),

    CONSTRAINT "productos_importados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventarios" (
    "id" SERIAL NOT NULL,
    "productoId" INTEGER NOT NULL,
    "cantidadActual" INTEGER NOT NULL DEFAULT 0,
    "cantidadMinima" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_inventario" (
    "id" SERIAL NOT NULL,
    "inventarioId" INTEGER NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "motivo" TEXT,
    "referencia" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuraciones" (
    "id" SERIAL NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "descripcion" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuraciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monedas" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "simbolo" TEXT NOT NULL DEFAULT '$',
    "tasaDefecto" DECIMAL(14,4) NOT NULL DEFAULT 1,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monedas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_gasto" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_gasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasas_cambio_contenedor" (
    "id" SERIAL NOT NULL,
    "importacionId" INTEGER NOT NULL,
    "monedaId" INTEGER NOT NULL,
    "tasaCambio" DECIMAL(14,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasas_cambio_contenedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gastos_contenedor" (
    "id" SERIAL NOT NULL,
    "importacionId" INTEGER NOT NULL,
    "tipoGastoId" INTEGER NOT NULL,
    "monedaId" INTEGER NOT NULL,
    "monto" DECIMAL(14,4) NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gastos_contenedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas" (
    "id" SERIAL NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "totalTransferencias" DECIMAL(15,2) NOT NULL,
    "totalUnidades" INTEGER NOT NULL,
    "totalCUP" DECIMAL(15,2) NOT NULL,
    "modoDistribucion" TEXT NOT NULL,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transferencias" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "monto" DECIMAL(15,2) NOT NULL,
    "ref_origen" TEXT,
    "ref_corriente" TEXT,
    "ordenante" TEXT,
    "ventaId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transferencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lineas_venta" (
    "id" SERIAL NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "productoId" INTEGER NOT NULL,
    "productoImportadoId" INTEGER NOT NULL,
    "canal" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(15,4) NOT NULL,
    "subtotal" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lineas_venta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "productos_codefref_key" ON "productos"("codefref");

-- CreateIndex
CREATE UNIQUE INDEX "importadoras_nombre_key" ON "importadoras"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "proveedores_nombre_key" ON "proveedores"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "inventarios_productoId_key" ON "inventarios"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "configuraciones_clave_key" ON "configuraciones"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "monedas_codigo_key" ON "monedas"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_gasto_nombre_key" ON "tipos_gasto"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "tasas_cambio_contenedor_importacionId_monedaId_key" ON "tasas_cambio_contenedor"("importacionId", "monedaId");

-- CreateIndex
CREATE UNIQUE INDEX "transferencias_ref_origen_key" ON "transferencias"("ref_origen");

-- AddForeignKey
ALTER TABLE "importaciones" ADD CONSTRAINT "importaciones_importadoraId_fkey" FOREIGN KEY ("importadoraId") REFERENCES "importadoras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importaciones" ADD CONSTRAINT "importaciones_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos_importados" ADD CONSTRAINT "productos_importados_importacionId_fkey" FOREIGN KEY ("importacionId") REFERENCES "importaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos_importados" ADD CONSTRAINT "productos_importados_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventarios" ADD CONSTRAINT "inventarios_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_inventarioId_fkey" FOREIGN KEY ("inventarioId") REFERENCES "inventarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasas_cambio_contenedor" ADD CONSTRAINT "tasas_cambio_contenedor_importacionId_fkey" FOREIGN KEY ("importacionId") REFERENCES "importaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasas_cambio_contenedor" ADD CONSTRAINT "tasas_cambio_contenedor_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "monedas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos_contenedor" ADD CONSTRAINT "gastos_contenedor_importacionId_fkey" FOREIGN KEY ("importacionId") REFERENCES "importaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos_contenedor" ADD CONSTRAINT "gastos_contenedor_monedaId_fkey" FOREIGN KEY ("monedaId") REFERENCES "monedas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos_contenedor" ADD CONSTRAINT "gastos_contenedor_tipoGastoId_fkey" FOREIGN KEY ("tipoGastoId") REFERENCES "tipos_gasto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias" ADD CONSTRAINT "transferencias_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_venta" ADD CONSTRAINT "lineas_venta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_venta" ADD CONSTRAINT "lineas_venta_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_venta" ADD CONSTRAINT "lineas_venta_productoImportadoId_fkey" FOREIGN KEY ("productoImportadoId") REFERENCES "productos_importados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


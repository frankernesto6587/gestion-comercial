import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ============================================
  // MONEDAS
  // ============================================
  const monedas = [
    {
      codigo: "CUP",
      nombre: "Peso Cubano (MN)",
      simbolo: "$",
      tasaDefecto: 1.0,
    },
    {
      codigo: "USD",
      nombre: "Dólar Estadounidense",
      simbolo: "$",
      tasaDefecto: 320.0,
    },
    {
      codigo: "MLC",
      nombre: "Moneda Libremente Convertible",
      simbolo: "$",
      tasaDefecto: 280.0,
    },
    {
      codigo: "EUR",
      nombre: "Euro",
      simbolo: "€",
      tasaDefecto: 350.0,
    },
  ];

  for (const moneda of monedas) {
    await prisma.moneda.upsert({
      where: { codigo: moneda.codigo },
      update: {},
      create: moneda,
    });
    console.log(`  Moneda: ${moneda.codigo} - ${moneda.nombre}`);
  }

  // ============================================
  // TIPOS DE GASTO
  // ============================================
  const tiposGasto = [
    { nombre: "Aranceles", descripcion: "Aranceles aduanales" },
    { nombre: "Servicios Importadora", descripcion: "Servicios de la importadora" },
    { nombre: "Flete Internacional", descripcion: "Costo de transporte internacional" },
    { nombre: "Flete Interno", descripcion: "Costo de transporte interno" },
    { nombre: "Almacenaje", descripcion: "Gastos de almacenamiento" },
    { nombre: "Seguro", descripcion: "Seguro de la mercancía" },
    { nombre: "Otros Gastos", descripcion: "Otros gastos no clasificados" },
  ];

  for (const tipo of tiposGasto) {
    await prisma.tipoGasto.upsert({
      where: { nombre: tipo.nombre },
      update: {},
      create: tipo,
    });
    console.log(`  Tipo de gasto: ${tipo.nombre}`);
  }

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

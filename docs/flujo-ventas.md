# Flujo del Módulo de Ventas - Resumen Completo

---

## 1. DATOS QUE INGRESA EL USUARIO

### A. Período de ventas:
- Fecha inicio: 1-diciembre-2025
- Fecha fin: 31-diciembre-2025

### B. Días con transferencia bancaria (datos reales del banco):
| Fecha | Monto Transferencia |
|-------|---------------------|
| 5-dic | 50,000 CUP |
| 12-dic | 80,000 CUP |
| 20-dic | 100,000 CUP |

### C. Productos a vender:
- Selecciona productos del inventario con stock disponible

### D. Modo de distribución entre productos:

#### Modo MANUAL
El usuario asigna porcentajes manualmente a cada producto:
```
Transferencia total: 230,000 CUP

Usuario define:
- Cerveza Bucanero: 60% → 138,000 CUP
- Malta Bucanero: 40% → 92,000 CUP
```

#### Modo AUTOMÁTICO
La app calcula según el stock disponible de cada producto:
```
Stock total vendible: 100,000 unidades
- Cerveza: 70,000 uds (70% del stock)
- Malta: 30,000 uds (30% del stock)

Transferencia: 230,000 CUP
- Cerveza: 70% → 161,000 CUP
- Malta: 30% → 69,000 CUP
```

---

## 2. CÁLCULO DE UNIDADES (Por cada producto)

Cada producto sigue su propio flujo con sus propios precios FIFO.

### Paso 2.1: Obtener precios FIFO de cada producto (del contenedor más antiguo con stock)
```
CERVEZA BUCANERO (Contenedor #4):
  - Precio USD: 73.53 CUP
  - Precio Fiscal: 173 CUP
  - Precio Efectivo: 155.70 CUP

MALTA BUCANERO (Contenedor #3):
  - Precio USD: 65.00 CUP
  - Precio Fiscal: 150 CUP
  - Precio Efectivo: 135.00 CUP
```

### Paso 2.2: Calcular unidades fiscales por producto (de las transferencias reales)

**Ejemplo con Modo Manual (60% Cerveza, 40% Malta):**
```
Transferencia total = 230,000 CUP

CERVEZA (60% = 138,000 CUP):
  Unidades fiscales = 138,000 / 173 = 797.69 → 798 unidades

MALTA (40% = 92,000 CUP):
  Unidades fiscales = 92,000 / 150 = 613.33 → 614 unidades
```

### Paso 2.3: Calcular total de unidades a vender por producto
```
CERVEZA:
  Unidades fiscales (798) = 5% del total
  Total = 798 / 0.05 = 15,960 unidades

MALTA:
  Unidades fiscales (614) = 5% del total
  Total = 614 / 0.05 = 12,280 unidades
```

### Paso 2.4: Distribuir por canal (por cada producto)
```
CERVEZA (15,960 unidades):
  - USD (91%):      14,523 unidades
  - Fiscal (5%):       798 unidades
  - Efectivo (4%):     639 unidades

MALTA (12,280 unidades):
  - USD (91%):      11,175 unidades
  - Fiscal (5%):       614 unidades
  - Efectivo (4%):     491 unidades
```

---

## 3. MANEJO DE FRACCIONES (Redondeo)

Si el cálculo da decimales, **la fracción se completa y se cobra a precio Fiscal** (el más caro).

### Ejemplo:
```
Cálculo real: 1,329.48 unidades fiscales
Acción: Se venden 1,330 unidades
El 0.52 extra se cobra a 173 CUP (precio fiscal)
```

### Regla:
- Fiscal: `Math.ceil()` (redondear arriba)
- USD y Efectivo: `Math.floor()` (redondear abajo)
- Diferencia sobrante: se suma a Fiscal

---

## 4. DISTRIBUCIÓN TEMPORAL (Calendario)

### Días CON transferencia → Venta obligatoria en Fiscal
```
5-dic:  Vender unidades fiscales por 50,000 CUP (289 uds)
12-dic: Vender unidades fiscales por 80,000 CUP (463 uds)
20-dic: Vender unidades fiscales por 100,000 CUP (578 uds)
```

### Días hábiles SIN transferencia → Repartir USD y Efectivo
```
Días hábiles del período: 22 días
Días con transferencia: 3 días
Días restantes: 19 días

Cada día vender:
- USD: 24,206 / 19 = ~1,274 unidades/día
- Efectivo: 1,064 / 19 = ~56 unidades/día
```

---

## 5. RESULTADO FINAL

### Registro de ventas generado:

| Fecha | Producto | Canal | Unidades | Precio | Subtotal |
|-------|----------|-------|----------|--------|----------|
| 1-dic | Cerveza | USD | 764 | 73.53 | 56,197 |
| 1-dic | Cerveza | Efectivo | 34 | 155.70 | 5,294 |
| 1-dic | Malta | USD | 588 | 65.00 | 38,220 |
| 1-dic | Malta | Efectivo | 26 | 135.00 | 3,510 |
| ... | ... | ... | ... | ... | ... |
| 5-dic | Cerveza | **Fiscal** | 173 | 173.00 | 29,929 |
| 5-dic | Malta | **Fiscal** | 134 | 150.00 | 20,100 |
| ... | ... | ... | ... | ... | ... |

### Totales por producto:
```
CERVEZA BUCANERO:
  USD:      14,523 uds × 73.53  = 1,067,989 CUP
  Fiscal:      798 uds × 173.00 =   138,054 CUP
  Efectivo:    639 uds × 155.70 =    99,492 CUP
  Subtotal: 15,960 uds           = 1,305,535 CUP

MALTA BUCANERO:
  USD:      11,175 uds × 65.00  =   726,375 CUP
  Fiscal:      614 uds × 150.00 =    92,100 CUP
  Efectivo:    491 uds × 135.00 =    66,285 CUP
  Subtotal: 12,280 uds           =   884,760 CUP

─────────────────────────────────────────────────
TOTAL:      28,240 uds           = 2,190,295 CUP
```

---

## 6. IMPACTO EN INVENTARIO

```
CERVEZA BUCANERO:
  Stock antes:  67,737 unidades
  Vendido:      15,960 unidades
  Stock después: 51,777 unidades

MALTA BUCANERO:
  Stock antes:  30,000 unidades
  Vendido:      12,280 unidades
  Stock después: 17,720 unidades
```

---

## 7. EXPORTAR A EXCEL

Una vez generadas las ventas, el usuario puede exportar a Excel con:

### Botón "Exportar a Excel"
Genera un archivo `.xlsx` con las siguientes hojas:

#### Hoja 1: "Resumen"
| Campo | Valor |
|-------|-------|
| Período | 1-dic-2025 a 31-dic-2025 |
| Total Transferencias | 230,000 CUP |
| Total Unidades Vendidas | 28,240 |
| Total Ventas CUP | 2,190,295 |

#### Hoja 2: "Ventas por Día"
| Fecha | Producto | Canal | Unidades | Precio | Subtotal |
|-------|----------|-------|----------|--------|----------|
| 1-dic | Cerveza | USD | 764 | 73.53 | 56,197 |
| 1-dic | Cerveza | Efectivo | 34 | 155.70 | 5,294 |
| ... | ... | ... | ... | ... | ... |

#### Hoja 3: "Totales por Producto"
| Producto | Canal | Unidades | Subtotal CUP |
|----------|-------|----------|--------------|
| Cerveza | USD | 14,523 | 1,067,989 |
| Cerveza | Fiscal | 798 | 138,054 |
| Cerveza | Efectivo | 639 | 99,492 |
| Malta | USD | 11,175 | 726,375 |
| ... | ... | ... | ... |

#### Hoja 4: "Movimientos Inventario"
| Producto | Stock Inicial | Vendido | Stock Final |
|----------|---------------|---------|-------------|
| Cerveza | 67,737 | 15,960 | 51,777 |
| Malta | 30,000 | 12,280 | 17,720 |

---

## RESUMEN

> 1. El usuario ingresa un **período** y los **montos reales de transferencias bancarias** por día.
>
> 2. Selecciona los **productos** a vender y elige el **modo de distribución**:
>    - **Manual**: asigna porcentajes a cada producto
>    - **Automático**: la app distribuye según el stock de cada producto
>
> 3. Para cada producto, el sistema:
>    - Obtiene precios **FIFO** (del contenedor más antiguo con stock)
>    - Calcula **unidades fiscales** = monto asignado / precio fiscal
>    - Deriva **total unidades** = unidades fiscales / 5%
>    - Distribuye: **91% USD**, **5% Fiscal**, **4% Efectivo**
>
> 4. **Distribución temporal**:
>    - Días CON transferencia → ventas fiscales obligatorias
>    - Días hábiles SIN transferencia → ventas USD y Efectivo
>
> 5. **Fracciones**: se redondean hacia arriba y se cobran al precio Fiscal (el más caro).

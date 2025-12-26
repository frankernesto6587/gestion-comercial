# Datos de Ejemplo: Malta Bucanero (Excel Original)

Este archivo contiene los datos del documento Excel original que se usó como referencia para desarrollar la aplicación.

---

## Datos de la Factura

| Campo | Valor |
|-------|-------|
| **Importadora** | Serlovem |
| **Producto** | Cerveza Bucanero - Lata 350ml |
| **Cantidad** | 1,800 unidades |
| **Importe Total** | $590.77 USD |

---

## Parámetros de Cálculo

| Parámetro | Valor |
|-----------|-------|
| **Tasa de Cambio** | 320 CUP/USD |
| **Margen de Utilidad** | 15% |
| **Porcentaje de Merma** | 2% |
| **Aranceles CUP** | 0 |
| **Servicios Importadora** | 0 |

---

## Cálculos Realizados

### 1. Costo Unitario
```
Costo Unitario = Importe / Cantidad
Costo Unitario = $590.77 / 1800
Costo Unitario = $0.328 USD
```

### 2. Precio de Venta USD (con margen 15%)
```
Precio Venta = Costo / (1 - Margen%)
Precio Venta = $0.328 / (1 - 0.15)
Precio Venta = $0.328 / 0.85
Precio Venta = $0.386 USD ≈ $0.39 USD
```

### 3. Precio de Venta CUP
```
Precio CUP = Precio USD × Tasa de Cambio
Precio CUP = $0.386 × 320
Precio CUP = 123.56 CUP
```

### 4. Cantidad Vendible (descontando merma 2%)
```
Cantidad Vendible = Cantidad × (1 - Merma%)
Cantidad Vendible = 1800 × (1 - 0.02)
Cantidad Vendible = 1800 × 0.98
Cantidad Vendible = 1,764 unidades
```

---

## Resumen de Resultados

| Métrica | Valor |
|---------|-------|
| **Costo Unitario** | $0.33 USD |
| **Precio Venta USD** | $0.39 USD |
| **Precio Venta CUP** | 123.56 CUP |
| **Cantidad Original** | 1,800 unidades |
| **Cantidad Vendible** | 1,764 unidades |
| **Merma Estimada** | 36 unidades |

---

## Análisis de Rentabilidad

```
Inversión Total: $590.77 USD
Ingresos Esperados: 1,764 × $0.39 = $687.96 USD
Ganancia Bruta: $687.96 - $590.77 = $97.19 USD
Margen Real: 14.1% (después de merma)
```

---

## Notas

1. Los datos fueron extraídos del Excel "Malta Bucanero" proporcionado por el usuario
2. La aplicación replica estas fórmulas de cálculo automáticamente
3. Se puede ajustar la tasa de cambio, margen y merma por cada producto importado
4. El inventario se actualiza automáticamente al crear importaciones

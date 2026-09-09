# Día 1 · Deduplicación de eventos — 30–45 minutos
Una integración recibe webhooks que pueden repetirse. Implementa en **TypeScript** o **Python** una función `deduplicate(events, windowMs)` que devuelva los eventos aceptados conservando su orden.
Cada evento contiene `id` (string) y `timestamp` (entero en milisegundos).
Reglas:
- Los eventos llegan ordenados por `timestamp`, de menor a mayor.
- Acepta la primera aparición de cada `id`.
- Rechaza una repetición si han pasado menos de `windowMs` desde el último evento aceptado con ese `id`.
- Acepta el evento si ha transcurrido exactamente la ventana o más.
- Los eventos rechazados no reinician la ventana.
- No modifiques la entrada. Puedes asumir datos válidos y `windowMs > 0`.

Ejemplo:
```javascript
Entrada:
[
  {id: "a", timestamp: 0},
  {id: "b", timestamp: 100},
  {id: "a", timestamp: 400},
  {id: "a", timestamp: 1000},
  {id: "b", timestamp: 1050}
]
windowMs = 1000

Salida:
[
  {id: "a", timestamp: 0},
  {id: "b", timestamp: 100},
  {id: "a", timestamp: 1000}
]
```
Busca una solución que pueda manejar **100.000 eventos**. Incluye tests para entrada vacía, timestamps iguales y el límite exacto de la ventana.
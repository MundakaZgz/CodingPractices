# Día 3 · Procesamiento con concurrencia limitada — TypeScript · 30–45 minutos
Una integración necesita procesar muchos documentos con una API. Ejecutarlos uno a uno resulta lento; lanzarlos todos simultáneamente puede saturarla.
Implementa:
```typescript
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  process: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  // Tu implementación
}
```

### Contrato
- Nunca debe haber más de `limit` llamadas a `process` pendientes simultáneamente.
- Procesa cada elemento exactamente una vez, iniciándolos en orden de índice.
- Cuando quede capacidad y haya elementos pendientes, inicia el siguiente sin esperar a que termine todo un lote.
- Devuelve los resultados en el **orden original**, aunque terminen en otro orden.
- Si una llamada falla, guarda `{ status: "rejected", reason: error }` y continúa con las demás. Conserva el error original.
- Si tiene éxito, guarda `{ status: "fulfilled", value: resultado }`.
- Una excepción síncrona de `process` se trata igual que una promesa rechazada.
- Si `limit` no es un entero positivo, rechaza con `RangeError` sin llamar a `process`, incluso con entrada vacía.
- Con entrada vacía y límite válido, devuelve `[]`. No modifiques `items`.

###Ejemplo
```typescript
items = ["A", "B", "C"]
limit = 2

Se inician A y B.
B termina → se inicia C mientras A sigue pendiente.
C falla con errorC.
A termina.

Resultado:
[
  { status: "fulfilled", value: "resultado A" },
  { status: "fulfilled", value: "resultado B" },
  { status: "rejected", reason: errorC }
]
```

### Tests que espero
1. Entrada vacía y límites inválidos.
2. `limit = 1`: ejecución secuencial.
3. Límite mayor que el número de elementos.
4. Finalización desordenada con resultados correctamente ordenados.
5. Rechazo y excepción síncrona: los demás elementos siguen procesándose.
6. El máximo de llamadas simultáneas nunca supera el límite.
7. Se inicia otro elemento al liberarse un hueco, aunque uno anterior siga pendiente.

Usa promesas cuyo `resolve` o `reject` controles desde los tests para coordinar la ejecución sin depender de esperas temporales. No necesitas una API real ni librerías de control de concurrencia.
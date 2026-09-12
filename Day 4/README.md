# Día 4 · Limitador de frecuencia — Python · 30–45 minutos
Tu integración consume una API que admite como máximo `N peticiones en cualquier ventana de W segundos`. Implementa un limitador en memoria que decida si permite iniciar una petición.

```python
class SlidingWindowRateLimiter:
    def __init__(self, max_requests: int, window_seconds: float):
        ...

    def allow(self, now: float) -> bool:
        ...
```

`now` representa el tiempo actual en segundos. Lo recibes explícitamente para probar la lógica sin esperas reales.

### Contrato
1. `allow(now)` devuelve `True` si permite la petición y `False` si la rechaza.
2. Solo las peticiones **permitidas** consumen cuota. Las rechazadas no prolongan la ventana.
3. Al evaluar el instante `now`, cuentan las peticiones permitidas en el intervalo `(now - window_seconds, now]`. Una petición situada exactamente en el límite izquierdo ya ha caducado.
4. Las llamadas llegan con tiempos no decrecientes; puede haber varias con el mismo `now`.
5. Elimina los registros caducados: no acumules todo el historial.
6. El constructor lanza `ValueError` si `max_requests < 1` o `window_seconds <= 0`. Puedes asumir un entero para `max_requests` y tiempos numéricos finitos.
7. Cada instancia mantiene su propio estado.

No necesitas HTTP, esperas, concurrencia entre hilos ni librerías de rate limiting. Puedes usar la biblioteca estándar.

### Ejemplo

```
max_requests = 3
window_seconds = 10

allow(0)    → True
allow(1)    → True
allow(2)    → True
allow(3)    → False
allow(9.9)  → False
allow(10)   → True   # La petición de t=0 ha caducado
allow(10)   → False  # Siguen contando t=1, t=2 y t=10
allow(11)   → True   # La petición de t=1 ha caducado

```

### Tests que espero
- Primera petición y agotamiento de cuota.
- Varias peticiones en el mismo instante.
- Justo antes del límite y exactamente en él.
- Rechazos que no consumen cuota ni reinician la ventana.
- Un salto temporal que haga caducar varios registros.
- Capacidad de una sola petición.
- Parámetros inválidos e independencia entre instancias.

Busca una implementación que gestione eficientemente **100.000 llamadas**. Explica la complejidad temporal amortizada de `allow` y cuánto estado conserva.
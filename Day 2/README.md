# Día 2 · Reintentos de una API — Python · 30–45 minutos
Un cliente necesita consultar una API que falla ocasionalmente. Tu tarea es implementar una función que reintente los errores temporales, sin repetir solicitudes cuando el fallo es permanente.

```python
def fetch_with_retry(request, sleep, max_attempts=3, base_delay=0.5):
    ...
```

Recibes dos funciones:
- `request()`: devuelve un valor cualquiera si tiene éxito, o lanza una excepción.
- `sleep(seconds)`: espera el tiempo indicado. La recibes como parámetro para poder probar tu código sin esperas reales.

Define también una excepción `ApiError` con un atributo `status_code`.

### Reglas
1. Devuelve el resultado del primer intento exitoso, incluso si es `None`, `0` o `False`.
2. Reintenta únicamente `ApiError` con código **429 o entre 500 y 599**, ambos incluidos.
3. Propaga inmediatamente cualquier otro error.
4. `max_attempts` incluye el intento inicial. Cuando se agoten, propaga el último error.
5. Antes de cada reintento, espera siguiendo esta secuencia: `base_delay`, `base_delay * 2`, `base_delay * 4`…
6. No esperes antes del primer intento ni después del último fallo.
7. Si `max_attempts < 1` o `base_delay < 0`, lanza `ValueError` sin llamar a `request` ni a `sleep`. Puedes asumir que los parámetros tienen los tipos numéricos adecuados.

### Ejemplo
```python
max_attempts = 4
base_delay = 0.5

request → ApiError(503)
sleep(0.5)
request → ApiError(429)
sleep(1.0)
request → {"customer": "Ana"}

Resultado: {"customer": "Ana"}
Total: 3 llamadas a request y 2 a sleep
```
Con un `ApiError(401)` inicial, habría una sola llamada a `request`, ninguna espera y el error se propagaría.

### Tests que espero
- Éxito inmediato, incluido un resultado `None`.
- Fallos temporales seguidos de éxito.
- Agotamiento de intentos y tiempos de espera exactos.
- Error permanente y excepción ajena a `ApiError`.
- `max_attempts=1`, `base_delay=0` y parámetros inválidos.

No necesitas llamadas HTTP reales ni librerías de reintentos. Puedes resolverlo en TypeScript si prefieres, aunque hoy toca practicar Python.
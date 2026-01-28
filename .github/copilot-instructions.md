# Instrucciones para agentes IA (repositorio `roomiegastos`)

Nota rápida: al momento de generar este archivo no se detectaron archivos de código o documentación observables en el repositorio (ruta de trabajo: /Users/miguelmendosa/roomiegastos). Antes de proponer cambios grandes, sigue los pasos de reconocimiento listados abajo.

## Objetivo corto
- Ayudar a un agente IA a volverse productivo aquí: descubrir la pila, entender límites de servicios, correr pruebas y proponer cambios seguros.

## Reconocimiento inicial (obligatorio)
- Listar contenido raíz: `ls -la` y revisar `README.md`.
- Detectar lenguajes/stack: buscar `package.json`, `pyproject.toml`, `requirements.txt`, `go.mod`, `Gemfile`, `Cargo.toml`, `Dockerfile`, `android/`, `ios/`, `src/`, `backend/`, `frontend/`.
- Comandos útiles:
  - `rg --hidden --glob '!node_modules' -n "" || true` (buscar rápidamente archivos)
  - `git status --porcelain` (ver estado local)

Si el repo está vacío o faltan artefactos, reporta eso al autor y solicita acceso a la rama o al código fuente correcto.

## Qué buscar para comprender arquitectura
- Ficheros que suelen definir límites de servicio: `docker-compose.yml`, `Dockerfile`, `k8s/`, `api/`, `services/`, `worker/`.
- Contratos de datos: carpetas `migrations/`, `schema/`, `openapi.yaml`/`swagger.yaml` o `proto/`.
- Punto(s) de entrada: `src/main.*`, `index.js`, `app.py`, `manage.py`.

## Flujo de trabajo recomendado para cambios
- 1) Ejecutar reconocimiento y enumerar hallazgos en la PR/commit.
- 2) Proponer cambios pequeños y bien justificados (un archivo o función a la vez).
- 3) Usar `apply_patch` para editar archivos (sigue la sintaxis del repositorio de trabajo).
- 4) Ejecutar pruebas locales; si no hay pruebas, pedir al autor que indique el comando de test.

## Comandos de construcción y pruebas — cómo detectarlos
- Si existe `package.json` → `npm ci` / `npm test` o `pnpm install && pnpm test`.
- Si existe `pyproject.toml` o `requirements.txt` → `python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && pytest`.
- Si existe `go.mod` → `go test ./...`.
- Si existen `Dockerfile`/`docker-compose.yml` → `docker compose up --build` para reproducir servicios.

## Convenciones de codificación y PRs (qué buscar y seguir)
- Prefiere cambios mínimos por PR y referencias a archivos afectados.
- Respeta el formato y las herramientas existentes: usa `prettier`, `black`, `gofmt`, etc., sólo si están presentes en el repo.
- Si no hay linter/formatter configurado, sugiere añadir uno en una PR separada.

## Integraciones y secretos
- Buscar `*.env`, `secrets`, `terraform/`, `aws/`, `gcp/`, `github/workflows/` para entender CI/CD.
- Nunca imprimir ni proponer valores secretos en los cambios; si necesitas credenciales para pruebas, pide instrucciones al propietario.

## Qué reportar en la primera PR/nota del agente
- Lista corta de descubrimientos (archivos clave y ausencia de artefactos).
- Comandos usados para reconocimiento.
- Propuesta concreta (archivo(s) a cambiar, por qué, cómo probar localmente).

---
Por favor revisa este borrador. Indica: (A) si el repositorio contiene archivos que no se detectaron, o (B) ejemplos concretos de archivos/paquetes/commands que deba incluir en las secciones de "Construcción y pruebas" para hacer las instrucciones más específicas.

# ─────────────────────────────────────────────────────────────────────────────
# MEVACOL Backend — Dockerfile para Render.com
# Multi-stage build: compila TypeScript en la etapa builder y ejecuta
# solo el JS compilado en producción. No requiere dependencias nativas
# porque pg (node-postgres) es Pure JavaScript.
# ─────────────────────────────────────────────────────────────────────────────

# ── Etapa 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /build

# Copiar manifiestos de dependencias primero (aprovecha cache de capas Docker)
COPY backend/package*.json ./

# Instalar dependencias para compilar
RUN npm install

# Copiar código fuente TypeScript
COPY backend/src ./src
COPY backend/tsconfig.json ./

# Compilar TypeScript → JavaScript en /build/dist
RUN npm run build

# Copiar schema.sql al directorio dist/database/ (lo lee db.ts en runtime)
RUN mkdir -p dist/database && cp src/database/schema.sql dist/database/schema.sql


# ── Etapa 2: Producción ───────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Copiar manifiestos e instalar dependencias de producción
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copiar código compilado + schema SQL desde la etapa de build
COPY --from=builder /build/dist ./dist

# ── Variables de entorno (se sobreescriben con env vars en Render.com) ───────
ENV NODE_ENV=production
# Render inyecta PORT automáticamente; 10000 es el valor que Render asigna por defecto
ENV PORT=10000

EXPOSE 10000

# Iniciar el servidor compilado
CMD ["node", "dist/index.js"]

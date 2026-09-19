# ─────────────────────────────────────────────────────────────────────────────
# MEVACOL Backend — Dockerfile para Fly.io
# Multi-stage build: compila TypeScript en Linux para que better-sqlite3
# quede enlazado con las librerías nativas del contenedor de producción.
# ─────────────────────────────────────────────────────────────────────────────

# ── Etapa 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# better-sqlite3 requiere herramientas de compilación nativa
RUN apk add --no-cache python3 make g++

WORKDIR /build

# Copiar manifiestos de dependencias primero (cache de capas Docker)
COPY backend/package*.json ./

# Instalar TODAS las dependencias (incluye TypeScript para compilar)
RUN npm ci

# Copiar código fuente TypeScript
COPY backend/src ./src
COPY backend/tsconfig.json ./

# Compilar TypeScript → JavaScript en /build/dist
RUN npm run build

# Copiar schema.sql al directorio dist/database/ (lo lee db.ts en runtime)
RUN mkdir -p dist/database && cp src/database/schema.sql dist/database/schema.sql


# ── Etapa 2: Producción ───────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Herramientas para recompilar better-sqlite3 en el entorno de producción
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar manifiestos e instalar SOLO dependencias de producción
# (npm ci --omit=dev recompila better-sqlite3 nativo para Linux Alpine)
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copiar código compilado + schema SQL desde la etapa de build
COPY --from=builder /build/dist ./dist

# Crear directorio para el volumen persistente de SQLite
# Fly.io montará el volumen en /data al iniciar
RUN mkdir -p /data

# ── Variables de entorno (se sobreescriben con secrets en Fly.io) ────────────
ENV NODE_ENV=production
ENV PORT=8080
ENV DB_FILE=/data/mevacol.db

EXPOSE 8080

# Iniciar el servidor compilado
CMD ["node", "dist/index.js"]

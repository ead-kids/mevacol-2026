# MEVACOL — Sistema Integral de Inventario, Ventas y Entregas

**MEVACOL** es una aplicación **Fullstack PWA** (Progressive Web App) para la gestión integral de inventario, ventas, facturación y entregas. Funciona en escritorio, tablet y móvil, con soporte offline mediante IndexedDB.

---

## 🏗️ Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Frontend** | React 19 + Vite 8 + TypeScript |
| **Estilos** | CSS personalizado (sin frameworks externos) |
| **Iconos / Gráficas** | Lucide React · Recharts |
| **Mapas** | Leaflet + OpenStreetMap |
| **PWA / Offline** | vite-plugin-pwa · Workbox · Dexie.js (IndexedDB) |
| **Backend** | Node.js + Express 5 + TypeScript |
| **Base de datos** | SQLite (better-sqlite3) con modo WAL |
| **Autenticación** | JWT (jsonwebtoken) + bcryptjs |
| **Roles** | RBAC: ADMINISTRADOR · VENDEDOR · ENTREGADOR |

---

## 🚀 Inicio Rápido (Desarrollo Local)

### Requisitos
- Node.js ≥ 18
- npm ≥ 9

### 1. Clonar e instalar dependencias

```bash
git clone <url-del-repositorio>
cd "mevacol programa de inventario"

# Instalar dependencias del backend
cd backend && npm install && cd ..

# Instalar dependencias del frontend
cd frontend && npm install && cd ..
```

### 2. Configurar variables de entorno

```bash
# Backend
cp backend/.env.example backend/.env
# Edita backend/.env y define JWT_SECRET con un valor seguro

# Frontend (opcional en desarrollo, usa /api por defecto)
cp frontend/.env.example frontend/.env
```

### 3. Iniciar el sistema

```bash
# Terminal 1 — Backend (Puerto 4000)
npm run dev:backend

# Terminal 2 — Frontend PWA (Puerto 3000)
npm run dev:frontend
```

Abre: 👉 **[http://localhost:3000](http://localhost:3000)**

---

## 👥 Usuarios de Prueba

> [!IMPORTANT]
> Las contraseñas reales NO se documentan aquí por seguridad.
> Usa el **Asistente de Inicio (Bootstrap Wizard)** para crear el primer Administrador.
> Los usuarios adicionales se crean desde el panel de Administración → Usuarios.

| Rol | Usuario de ejemplo | Dispositivo / Experiencia |
|-----|--------------------|--------------------------|
| **ADMINISTRADOR** | `admin` | Escritorio — Panel administrativo completo |
| **VENDEDOR** | `vendedor1` | Móvil / Táctil — Ventas en campo |
| **ENTREGADOR** | `entregador1` | Móvil / Táctil — Logística y rutas GPS |

---

## 🗂️ Estructura de Carpetas

```
mevacol programa de inventario/
├── backend/                    # API REST Node.js + Express
│   ├── src/
│   │   ├── config/             # Configuración y variables de entorno
│   │   ├── database/           # Conexión SQLite, esquema y migraciones
│   │   ├── middlewares/        # Auth JWT, RBAC, manejo de errores
│   │   └── modules/            # Módulos de negocio (auth, users, products…)
│   │       ├── auth/
│   │       ├── customers/
│   │       ├── dashboard/
│   │       ├── deliveries/
│   │       ├── geo/
│   │       ├── invoices/
│   │       ├── products/
│   │       ├── reports/
│   │       ├── sales/
│   │       ├── system/
│   │       └── users/
│   ├── .env.example            # Plantilla de variables de entorno
│   └── package.json
│
├── frontend/                   # React + Vite + TypeScript + PWA
│   ├── public/                 # Assets estáticos (logo, iconos PWA)
│   ├── src/
│   │   ├── assets/             # CSS global del sistema
│   │   ├── components/         # Componentes reutilizables
│   │   │   ├── common/         # Badge de conexión, utilidades UI
│   │   │   ├── invoices/       # Visor de facturas e impresión
│   │   │   ├── layout/         # Sidebar del administrador
│   │   │   └── maps/           # Componente Leaflet
│   │   ├── context/            # AuthContext, NetworkContext
│   │   ├── db/                 # Dexie.js — IndexedDB local
│   │   ├── pages/
│   │   │   ├── admin/          # 10 páginas del panel administrador
│   │   │   ├── auth/           # Login + Bootstrap Wizard
│   │   │   ├── delivery/       # 2 páginas del entregador
│   │   │   └── seller/         # 5 páginas del vendedor
│   │   ├── services/           # api.ts + syncService.ts + mapService.ts
│   │   ├── types/              # Tipos TypeScript globales
│   │   └── utils/              # Utilidades (numberToWords, etc.)
│   ├── .env.example            # Plantilla de variables de entorno Vite
│   └── package.json
│
├── .gitignore
├── package.json                # Scripts centralizados (dev/build)
└── README.md
```

---

## ⚙️ Variables de Entorno

### Backend (`backend/.env`)

| Variable | Descripción | Requerida en Producción |
|----------|-------------|------------------------|
| `NODE_ENV` | `development` o `production` | ✅ |
| `PORT` | Puerto del servidor (default: 4000) | ─ |
| `JWT_SECRET` | Secreto para firmar tokens JWT — debe ser largo y aleatorio | ✅ OBLIGATORIO |
| `DB_FILE` | Ruta al archivo SQLite (default: `backend/mevacol.db`) | ✅ (ruta persistente) |
| `CORS_ORIGIN` | Dominios permitidos por CORS (default: `*` en dev) | ✅ |

### Frontend (`frontend/.env`)

| Variable | Descripción | Default |
|----------|-------------|---------|
| `VITE_API_URL` | URL base de la API. En producción: `https://api.midominio.com/api` | `/api` |

---

## 🔨 Comandos de Build

```bash
# Compilar backend (TypeScript → JavaScript)
npm run build:backend

# Compilar frontend (TypeScript + Vite → dist/)
npm run build:frontend

# Compilar ambos
npm run build

# Iniciar backend compilado (producción)
npm run start
```

---

## 🌐 Módulos Implementados (Fases 1–9)

| Fase | Módulo | Descripción |
|------|--------|-------------|
| 1 | **Autenticación y RBAC** | JWT, bcrypt, Bootstrap Wizard, roles |
| 2 | **Clientes** | CRUD, búsqueda, activar/desactivar |
| 3 | **Productos e Inventario** | CRUD, ajuste de stock, categorías, alertas |
| 4 | **Ventas** | Crear venta, agregar ítems, estados, totalización |
| 5 | **Facturación** | Factura automática por venta, visor de impresión |
| 6 | **Entregas** | Asignación, estados, historial, entregadores |
| 7 | **Geo y Mapas** | Geocodificación, Leaflet, plan de rutas |
| 8 | **Dashboard y Reportes** | Métricas por rol, gráficas Recharts, 6 tipos de reportes |
| 9 | **Pruebas y Seguridad** | CORS configurable, JWT env, sync offline, code splitting |

---

## 🔒 Seguridad

- Contraseñas cifradas con **bcryptjs** (salt rounds = 10)
- Tokens JWT firmados — expiración 7 días
- `JWT_SECRET` NUNCA hardcodeado — lanzado como error en producción si falta
- CORS configurable por variable de entorno
- Base de datos SQLite excluida del repositorio (`.gitignore`)
- RBAC validado en servidor (no solo en el frontend)
- Auditoría de acciones en tabla `audit_logs`

---

## 📱 PWA / Offline

- Instalable en Android, iOS y Escritorio como app nativa
- Service Worker con Workbox para caché offline
- IndexedDB (Dexie.js) para cola de sincronización offline
- Sincronización automática al recuperar conexión
- Indicador de estado en tiempo real: 🟢 Online / 🔴 Sin Internet

---

## 🗃️ Base de Datos

- **Motor**: SQLite con `better-sqlite3`
- **Modo**: WAL (Write-Ahead Logging) para alto rendimiento concurrente
- **Claves foráneas**: activadas (`PRAGMA foreign_keys = ON`)
- **Migraciones**: automáticas y seguras en cada arranque (no destructivas)
- **Ubicación por defecto**: `backend/mevacol.db`
- **En producción**: configurar `DB_FILE` apuntando a almacenamiento persistente y realizar backups regulares

---

## 🚑 Solución de Problemas Frecuentes

| Problema | Solución |
|----------|----------|
| Backend no arranca en producción | Verifica que `JWT_SECRET` esté en `.env` |
| Frontend no conecta con la API en producción | Configura `VITE_API_URL` con la URL real del backend |
| La app muestra "Sin conexión" incorrectamente | Verifica que el proxy Vite esté activo en desarrollo |
| Error `UNIQUE constraint failed` en facturas | La factura ya fue generada; es comportamiento esperado |
| Bundle JS > 500KB (warning Vite) | Ya corregido con code splitting en Fase 9 |

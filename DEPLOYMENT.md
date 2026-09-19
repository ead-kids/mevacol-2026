# 🚀 Guía de Despliegue — MEVACOL en la Nube (Gratis para Siempre)

## Stack de Producción

| Componente | Plataforma | Costo |
|------------|-----------|-------|
| **Frontend** (React SPA/PWA) | GitHub Pages | ✅ Gratis |
| **Backend** (Node.js/Express) | Render.com | ✅ Gratis |
| **Base de Datos** (PostgreSQL) | Neon.tech | ✅ Gratis para siempre |

> **Nota:** El plan gratuito de Render pone el servidor a dormir tras 15 min sin tráfico.
> El primer request tras el "sleep" puede tardar ~30–60 segundos. Esto es normal.

---

## PASO 1 — Crear la Base de Datos en Neon.tech

1. Ve a **https://neon.tech** → Sign Up (con GitHub, sin tarjeta de crédito)
2. Click **"New Project"**
   - Project name: `mevacol`
   - Region: `US East (Virginia)` ← la más cercana al servidor de Render
   - PostgreSQL version: `16` (la última)
3. Click **"Create project"**
4. En la pantalla de bienvenida, copia la **Connection String**:
   - Click **"Connection Details"** → pestaña **"Connection string"**
   - Selecciona **"psql"** → copia la cadena completa
   - Se ve así: `postgresql://mevacol_owner:AbCd1234@ep-xxx-yyy.us-east-1.aws.neon.tech/neondb?sslmode=require`
   - **Guarda esta cadena** — la usarás en los pasos 2 y 3

---

## PASO 2 — Crear el Servicio en Render.com

1. Ve a **https://render.com** → Sign Up (con GitHub, sin tarjeta de crédito)
2. Dashboard → **"New +"** → **"Web Service"**
3. En "Source Code" → **"Connect a repository"** → autoriza GitHub y selecciona `mevacol-2026`
4. Render detectará el `render.yaml` automáticamente. Verifica:
   - **Name:** `mevacol-api`
   - **Runtime:** Docker
   - **Branch:** `main`
   - **Plan:** Free
5. **Configurar variables de entorno** (scroll down a "Environment Variables"):

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | La cadena de Neon del Paso 1 |
   | `JWT_SECRET` | Un secreto seguro (ver abajo cómo generar) |
   | `CORS_ORIGIN` | `https://TU-USUARIO.github.io` |

   > **Generar JWT_SECRET:** En tu terminal local ejecuta:
   > ```bash
   > node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   > ```
   > Copia el resultado (una cadena de 128 caracteres) como valor de `JWT_SECRET`.

6. Click **"Create Web Service"** → Render iniciará el primer build (tarda ~3–5 min)
7. Cuando el build termine, copia la URL del servicio:
   - Se ve así: `https://mevacol-api.onrender.com`
   - Verifica que funcione: `https://mevacol-api.onrender.com/api/health`
   - Debes ver: `{ "status": "online", "system": "MEVACOL API", ... }`

8. **Obtener el Deploy Hook** (para el workflow de GitHub Actions):
   - Dashboard → tu servicio → **Settings** → scroll down a **"Deploy Hook"**
   - Click **"Copy"** → guarda esa URL

---

## PASO 3 — Configurar Secrets en GitHub

Ve a tu repositorio → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Crea los siguientes secrets:

| Nombre del Secret | Valor |
|------------------|-------|
| `RENDER_DEPLOY_HOOK_URL` | La URL del Deploy Hook del Paso 2 |
| `VITE_API_URL` | `https://mevacol-api.onrender.com/api` |

---

## PASO 4 — Activar GitHub Pages

1. Repositorio → **Settings** → **Pages**
2. En "Source" → selecciona **"Deploy from a branch"**
3. Branch: **`gh-pages`** / folder: **`/ (root)`**
4. Click **Save**
5. La URL del frontend será: `https://TU-USUARIO.github.io/mevacol-2026/`

---

## PASO 5 — Primer Deploy

Haz un push a `main` o ve a **Actions** en GitHub y ejecuta los workflows manualmente:

1. Click **"Actions"** → selecciona **"🚀 Deploy Backend a Render.com"** → **"Run workflow"**
2. Click **"Actions"** → selecciona **"🚀 Deploy Frontend a GitHub Pages"** → **"Run workflow"**

---

## ✅ Checklist de Verificación

- [ ] `GET https://mevacol-api.onrender.com/api/health` → `{ status: "online" }`
- [ ] `GET https://mevacol-api.onrender.com/api/system/status` → responde sin errores
- [ ] `https://TU-USUARIO.github.io/mevacol-2026/` → carga la app
- [ ] La app muestra el **Bootstrap Wizard** (crear primer administrador)
- [ ] Crear administrador → Login exitoso
- [ ] Módulo de Productos carga correctamente
- [ ] Módulo de Ventas carga correctamente

---

## 🔧 Troubleshooting

### Error: "relation does not exist"
El schema no se aplicó. En el Render Dashboard, ve a tu servicio → **Logs** y busca el error exacto.
Si el problema es SSL: verifica que `DATABASE_URL` tenga `?sslmode=require` al final.

### Error: "JWT_SECRET not defined"
La variable de entorno `JWT_SECRET` no está configurada en Render. Agrégala en Settings → Environment.

### El frontend carga pero dice "Error de red"
Verifica que `VITE_API_URL` en GitHub Secrets apunte exactamente a tu URL de Render **incluyendo `/api`**.
También verifica que `CORS_ORIGIN` en Render incluya la URL de GitHub Pages.

### Render muestra "Build failed"
Revisa los logs del build en Render Dashboard. Los errores más comunes son:
- El `package-lock.json` está desactualizado → ejecuta `npm install` localmente y vuelve a hacer push
- Error de TypeScript → corre `npm run build` localmente primero

---

## 📊 Límites del Plan Gratuito

| Recurso | Límite |
|---------|--------|
| Render CPU | 0.1 vCPU compartido |
| Render RAM | 512 MB |
| Render Bandwidth | 100 GB/mes |
| Render Sleep | Sí (15 min inactividad) |
| Neon Storage | 512 MB |
| Neon Compute | 191.9 compute hours/mes |
| Neon Branches | 10 branches de BD |
| GitHub Pages | 1 GB storage, 100 GB/mes bandwidth |

Para MEVACOL (uso interno de empresa), estos límites son más que suficientes.

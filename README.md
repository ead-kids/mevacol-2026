# MEVACOL — Sistema Integral de Inventario, Ventas y Entregas

Bienvenido al sistema **MEVACOL**. Este proyecto está desarrollado como una **Progressive Web App (PWA)** moderna, responsive, modular y preparada para funcionamiento sin conexión (Offline-first).

---

## 🚀 Cómo Iniciar el Sistema Localmente

Para arrancar el sistema completo (backend y frontend), dispones de scripts preconfigurados:

```bash
# Iniciar Servidor Backend (Puerto 4000)
npm run dev:backend

# En otra terminal, iniciar Frontend PWA (Puerto 3000)
npm run dev:frontend
```

Luego abre tu navegador en:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 👥 Usuarios Configurados para Pruebas

| Rol | Usuario | Contraseña | Dispositivo / Experiencia |
| :--- | :--- | :--- | :--- |
| **ADMINISTRADOR** | `admin` | `admin123` | Computador (Escritorio) / Panel Administrativo |
| **VENDEDOR** | `vendedor1` | `vendedor123` | Celular / Táctil / Ventas en Campo |
| **ENTREGADOR** | `entregador1` | `Password123!` | Celular / Táctil / Logística y Rutas |
| **VENDEDOR 2** | `juan` | `123456` | Celular / Táctil / Ventas en Campo |

---

## 🏗️ Arquitectura Implementada en la Fase 1

1. **Autenticación Segura y Cero Contraseñas Quemadas:**
   - Cifrado unidireccional `bcryptjs` (salt rounds = 10).
   - Tokens JWT firmados para sesiones seguras.
   - Asistente de inicio único (*Bootstrap Wizard*) que se bloquea automáticamente tras crear el primer Administrador.
2. **Control de Acceso Basado en Roles (RBAC):**
   - Validación obligatoria de roles en el servidor backend (las rutas devuelven `403 Forbidden` ante accesos no autorizados).
   - Roles: `ADMINISTRADOR`, `VENDEDOR`, `ENTREGADOR`.
3. **Base de Datos Relacional ACID:**
   - SQLite de alto rendimiento con modo WAL y claves foráneas activas (`mevacol.db`).
   - Esquema DDL maestro ya preparado para todas las fases futuras (clientes, inventario, ventas abiertas, facturas en COP, pedidos, entregas, auditoría de cambios y conflictos de stock).
4. **Preparación PWA y Soporte Offline:**
   - Service Worker y Web App Manifest instalables en Android, iPhone y Escritorio.
   - Base de datos local IndexedDB (`Dexie.js`) con cola de sincronización (`outbox`) y UUIDs v4 para evitar colisiones.
   - Indicador de conexión en tiempo real: `🟢 CONECTADO (Sincronizado)` o `🔴 SIN INTERNET (X pendientes)`.
5. **Paneles Adaptativos por Rol:**
   - **Administrador:** Interfaz amplia de escritorio con barra lateral categorizada, métricas y módulo de usuarios (CRUD y activación/desactivación).
   - **Vendedor:** Interfaz móvil táctil con accesos rápidos para ventas en campo.
   - **Entregador:** Interfaz móvil táctil con contenedor reservado para mapa y rutas GPS.

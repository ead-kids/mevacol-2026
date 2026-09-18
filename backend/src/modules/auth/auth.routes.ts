import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db, recordAuditLog } from '../../database/db';
import { config } from '../../config';
import { authMiddleware } from '../../middlewares/auth.middleware';

export const authRouter = Router();

// 1. Asistente Seguro de Configuración del Primer Administrador (Bootstrap)
authRouter.post('/bootstrap', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validar si ya existe un administrador en el sistema
    const adminCheck = db.prepare(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE role_code = 'ADMINISTRADOR'
    `).get() as { count: number };

    if (adminCheck.count > 0) {
      res.status(400).json({
        success: false,
        error: 'El sistema ya ha sido inicializado con un Administrador. Inicie sesión para continuar.',
      });
      return;
    }

    const { username, full_name, password, email, phone } = req.body;

    if (!username || !full_name || !password) {
      res.status(400).json({
        success: false,
        error: 'Los campos nombre completo, nombre de usuario y contraseña son obligatorios.',
      });
      return;
    }

    const cleanUsername = String(username).trim().toLowerCase();
    if (cleanUsername.length < 3) {
      res.status(400).json({
        success: false,
        error: 'El nombre de usuario debe tener al menos 3 caracteres.',
      });
      return;
    }

    if (String(password).length < 6) {
      res.status(400).json({
        success: false,
        error: 'La contraseña de seguridad debe contener al menos 6 caracteres.',
      });
      return;
    }

    // Cifrado seguro de contraseña con salt rounds = 10
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    const insertStmt = db.prepare(`
      INSERT INTO users (id, username, full_name, email, password_hash, role_code, phone, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'ADMINISTRADOR', ?, 1, datetime('now'), datetime('now'))
    `);

    insertStmt.run(
      userId,
      cleanUsername,
      full_name.trim(),
      email ? String(email).trim().toLowerCase() : null,
      passwordHash,
      phone ? String(phone).trim() : null
    );

    // Registro de auditoría
    recordAuditLog({
      userId,
      action: 'BOOTSTRAP_ADMIN_CREATED',
      entityName: 'users',
      entityId: userId,
      details: { username: cleanUsername, role: 'ADMINISTRADOR' },
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'],
    });

    // Generar token de sesión inmediato
    const token = jwt.sign(
      { userId, username: cleanUsername, role_code: 'ADMINISTRADOR' },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN as any }
    );

    res.status(201).json({
      success: true,
      message: '¡Administrador inicial de MEVACOL configurado exitosamente!',
      token,
      user: {
        id: userId,
        username: cleanUsername,
        full_name: full_name.trim(),
        email: email ? String(email).trim().toLowerCase() : null,
        role_code: 'ADMINISTRADOR',
        phone: phone ? String(phone).trim() : null,
      },
    });
  } catch (error: any) {
    console.error('Error en bootstrap admin:', error);
    res.status(500).json({
      success: false,
      error: 'Error al inicializar el administrador: ' + error.message,
    });
  }
});

// 2. Inicio de Sesión Seguro para Todos los Roles
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      res.status(400).json({
        success: false,
        error: 'Debe ingresar su usuario/correo y su contraseña.',
      });
      return;
    }

    const cleanIdentifier = String(identifier).trim().toLowerCase();

    const userStmt = db.prepare(`
      SELECT id, username, full_name, email, password_hash, role_code, phone, is_active
      FROM users
      WHERE LOWER(username) = ? OR LOWER(email) = ?
    `);

    const user = userStmt.get(cleanIdentifier, cleanIdentifier) as any;

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Credenciales inválidas. Compruebe su usuario y contraseña.',
      });
      return;
    }

    if (user.is_active !== 1) {
      res.status(403).json({
        success: false,
        error: 'Su cuenta se encuentra desactivada. Comuníquese con la administración de MEVACOL.',
      });
      return;
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      res.status(401).json({
        success: false,
        error: 'Credenciales inválidas. Compruebe su usuario y contraseña.',
      });
      return;
    }

    // Registrar inicio de sesión en auditoría
    recordAuditLog({
      userId: user.id,
      action: 'USER_LOGIN',
      entityName: 'users',
      entityId: user.id,
      details: { username: user.username, role: user.role_code },
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'],
    });

    const token = jwt.sign(
      { userId: user.id, username: user.username, role_code: user.role_code },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN as any }
    );

    res.json({
      success: true,
      message: `Bienvenido a MEVACOL, ${user.full_name}`,
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role_code: user.role_code,
        phone: user.phone,
      },
    });
  } catch (error: any) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      error: 'Error al procesar el inicio de sesión: ' + error.message,
    });
  }
});

// 3. Obtener Usuario Actual Autenticado
authRouter.get('/me', authMiddleware, (req: Request, res: Response) => {
  res.json({
    success: true,
    user: req.user,
  });
});

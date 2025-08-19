import { Hono } from 'hono';
import type { Context } from 'hono';
import { 
  KEYCLOAK_BASE_URL, 
  KEYCLOAK_REALM, 
  KEYCLOAK_CLIENT_ID,
  KEYCLOAK_TOKEN_URL,
  KEYCLOAK_USERINFO_URL,
  ENABLE_DEV_AUTH
} from '../config/env.js';
import { validateKeycloakToken, getKeycloakUserInfo } from './keycloak.helper.js';
import { db } from '../db/client.js';
import { usuarios } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// ================================
// Servicio de Autenticación Keycloak
// ================================
class KeycloakAuthService {
  /**
   * Autentica un usuario con Keycloak usando username/password
   */
  static async login(username: string, password: string) {
    // Modo desarrollo - simular autenticación
    if (ENABLE_DEV_AUTH) {
      console.log('🔧 [DEV MODE] Simulando autenticación para:', username);
      
      // Validar credenciales básicas en modo desarrollo
      let mockKeycloakUser;
      
      if (username === 'agustin.lago@osmos.es' && password === 'Osmos2025') {
        mockKeycloakUser = {
          sub: 'dev-user-123',
          email: username,
          name: 'Agustín Lago (Dev)',
          preferred_username: username,
          realm_access: { roles: ['user', 'admin'] }
        };
      } else if (username === 'beatriz.rodriguez@osmos.es' && password === 'osmos') {
        mockKeycloakUser = {
          sub: 'dev-user-beatriz',
          email: username,
          name: 'Beatriz Rodríguez (Dev)',
          preferred_username: username,
          realm_access: { roles: ['user'] }
        };
      } else {
        throw new Error('Credenciales inválidas (Modo desarrollo)');
      }

      const appUser = await this.getOrCreateUser(mockKeycloakUser);
      
      // Generar un token JWT simple para desarrollo
      const mockToken = Buffer.from(JSON.stringify({
        sub: mockKeycloakUser.sub,
        email: mockKeycloakUser.email,
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hora
        iat: Math.floor(Date.now() / 1000)
      })).toString('base64');

      return {
        success: true,
        access_token: `dev-token-${mockToken}`,
        refresh_token: `dev-refresh-${mockToken}`,
        expires_in: 3600,
        user: appUser,
        keycloak_user: mockKeycloakUser
      };
    }

    try {
      console.log('🔐 [KeycloakAuth] Iniciando login para:', username);
      console.log('🔗 [KeycloakAuth] URL:', KEYCLOAK_TOKEN_URL);
      console.log('🆔 [KeycloakAuth] Client ID:', KEYCLOAK_CLIENT_ID);
      
      // 1. Obtener token de Keycloak
      const requestBody = new URLSearchParams({
        grant_type: 'password',
        client_id: KEYCLOAK_CLIENT_ID,
        username,
        password,
      });

      console.log('📡 [KeycloakAuth] Body a enviar:', requestBody.toString());

      const response = await fetch(KEYCLOAK_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: requestBody,
      });

      console.log('📡 [KeycloakAuth] Respuesta Keycloak status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [KeycloakAuth] Error de Keycloak:', errorData);
        throw new Error(errorData.error_description || 'Credenciales inválidas');
      }

      const tokenData = await response.json();

      // 2. Validar y decodificar el token
      const keycloakUser = await validateKeycloakToken(tokenData.access_token);

      // 3. Crear o actualizar usuario en nuestra base de datos
      const appUser = await this.getOrCreateUser(keycloakUser);

      return {
        success: true,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        user: appUser,
        keycloak_user: keycloakUser
      };

    } catch (error: any) {
      console.error('❌ [KeycloakAuth] Error completo:', error);
      console.error('❌ [KeycloakAuth] Error name:', error.name);
      console.error('❌ [KeycloakAuth] Error message:', error.message);
      console.error('❌ [KeycloakAuth] Error cause:', error.cause);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('No se puede conectar con Keycloak - Verificar conectividad de red');
      }
      
      throw new Error(error.message || 'Error de autenticación');
    }
  }

  /**
   * Refresca un token de acceso
   */
  static async refreshToken(refreshToken: string) {
    try {
      const response = await fetch(KEYCLOAK_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: KEYCLOAK_CLIENT_ID,
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Token de refresco inválido');
      }

      const tokenData = await response.json();
      
      // Validar el nuevo token
      const keycloakUser = await validateKeycloakToken(tokenData.access_token);
      const appUser = await this.getOrCreateUser(keycloakUser);

      return {
        success: true,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        user: appUser
      };

    } catch (error: any) {
      console.error('Error refrescando token:', error);
      throw new Error('No se pudo refrescar el token');
    }
  }

  /**
   * Obtiene información del usuario autenticado
   */
  static async getUserProfile(accessToken: string) {
    try {
      // Modo desarrollo - simular validación de token
      if (ENABLE_DEV_AUTH && accessToken.startsWith('dev-token-')) {
        console.log('🔧 [DEV MODE] Validando token de desarrollo');
        
        // Decodificar el token para obtener el usuario
        try {
          const tokenPayload = JSON.parse(Buffer.from(accessToken.replace('dev-token-', ''), 'base64').toString());
          
          let mockKeycloakUser;
          if (tokenPayload.sub === 'dev-user-123') {
            mockKeycloakUser = {
              sub: 'dev-user-123',
              email: 'agustin.lago@osmos.es',
              name: 'Agustín Lago (Dev)',
              preferred_username: 'agustin.lago@osmos.es',
              realm_access: { roles: ['user', 'admin'] }
            };
          } else if (tokenPayload.sub === 'dev-user-beatriz') {
            mockKeycloakUser = {
              sub: 'dev-user-beatriz',
              email: 'beatriz.rodriguez@osmos.es',
              name: 'Beatriz Rodríguez (Dev)',
              preferred_username: 'beatriz.rodriguez@osmos.es',
              realm_access: { roles: ['user'] }
            };
          } else {
            throw new Error('Token de desarrollo inválido');
          }

          const appUser = await this.getOrCreateUser(mockKeycloakUser);

          return {
            success: true,
            user: appUser,
            keycloak_user: mockKeycloakUser
          };
        } catch (error) {
          throw new Error('Token de desarrollo malformado');
        }
      }

      const keycloakUser = await validateKeycloakToken(accessToken);
      const appUser = await this.getOrCreateUser(keycloakUser);

      return {
        success: true,
        user: appUser,
        keycloak_user: keycloakUser
      };
    } catch (error: any) {
      throw new Error('Token inválido o expirado');
    }
  }

  /**
   * Obtiene o crea un usuario en nuestra base de datos usando Drizzle
   */
  private static async getOrCreateUser(keycloakUser: any) {
    try {
      // Buscar usuario existente por Keycloak ID
      const existingUsers = await db.select()
        .from(usuarios)
        .where(eq(usuarios.keycloak_id, keycloakUser.sub));

      if (existingUsers.length > 0) {
        // Usuario existe, actualizar información si es necesario
        const existingUser = existingUsers[0];
        
        if (existingUser.email !== keycloakUser.email) {
          await db.update(usuarios)
            .set({ 
              email: keycloakUser.email, 
              updated_at: new Date() 
            })
            .where(eq(usuarios.keycloak_id, keycloakUser.sub));
          
          existingUser.email = keycloakUser.email;
        }

        return {
          id: existingUser.id,
          keycloakId: keycloakUser.sub,
          userId: existingUser.id, // Para compatibilidad
          email: keycloakUser.email,
          name: keycloakUser.name || keycloakUser.preferred_username || keycloakUser.email,
          rol: existingUser.rol,
          keycloakRoles: keycloakUser.realm_access?.roles || []
        };
      } else {
        // Usuario no existe, crearlo
        const [newUser] = await db.insert(usuarios).values({
          keycloak_id: keycloakUser.sub,
          email: keycloakUser.email,
          rol: 'user' // Rol por defecto
        }).returning();

        return {
          id: newUser.id,
          keycloakId: keycloakUser.sub,
          userId: newUser.id, // Para compatibilidad
          email: keycloakUser.email,
          name: keycloakUser.name || keycloakUser.preferred_username || keycloakUser.email,
          rol: newUser.rol,
          keycloakRoles: keycloakUser.realm_access?.roles || []
        };
      }
    } catch (error) {
      console.error('Error en getOrCreateUser:', error);
      throw error;
    }
  }
}

// ================================
// Controlador de Autenticación
// ================================
class KeycloakAuthController {
  /**
   * POST /auth/keycloak/login - Login con Keycloak
   */
  static async login(c: Context) {
    try {
      console.log('🎯 [LoginController] Petición recibida');
      console.log('🎯 [LoginController] Headers:', Object.fromEntries(c.req.raw.headers.entries()));
      
      // Detectar tipo de contenido y parsear correctamente
      const contentType = c.req.header('Content-Type') || '';
      let username: string, password: string;
      
      if (contentType.includes('application/json')) {
        const body = await c.req.json();
        username = body.username;
        password = body.password;
      } else {
        // Asumir form-urlencoded como fallback
        const body = await c.req.formData();
        username = body.get('username') as string;
        password = body.get('password') as string;
      }
      
      console.log('🎯 [LoginController] Username recibido:', username);

      if (!username || !password) {
        return c.json({ 
          error: 'Username y password son requeridos' 
        }, 400);
      }

      const result = await KeycloakAuthService.login(username, password);

      return c.json({
        message: 'Autenticación exitosa',
        ...result
      });

    } catch (error: any) {
      console.error('Error en login controller:', error);
      return c.json({ 
        error: error.message || 'Error de autenticación' 
      }, 401);
    }
  }

  /**
   * POST /auth/keycloak/refresh - Refrescar token
   */
  static async refresh(c: Context) {
    try {
      const { refresh_token } = await c.req.json();

      if (!refresh_token) {
        return c.json({ 
          error: 'Refresh token es requerido' 
        }, 400);
      }

      const result = await KeycloakAuthService.refreshToken(refresh_token);

      return c.json({
        message: 'Token refrescado exitosamente',
        ...result
      });

    } catch (error: any) {
      console.error('Error en refresh controller:', error);
      return c.json({ 
        error: error.message || 'Error refrescando token' 
      }, 401);
    }
  }

  /**
   * GET /auth/keycloak/me - Información del usuario actual
   */
  static async me(c: Context) {
    try {
      const authHeader = c.req.header('Authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Token requerido' }, 401);
      }

      const token = authHeader.substring(7);
      const result = await KeycloakAuthService.getUserProfile(token);

      return c.json(result);

    } catch (error: any) {
      console.error('Error en me controller:', error);
      return c.json({ 
        error: error.message || 'Error obteniendo perfil' 
      }, 401);
    }
  }

  /**
   * POST /auth/keycloak/logout - Logout (principalmente para limpiar del lado cliente)
   */
  static async logout(c: Context) {
    // Para logout completo de Keycloak necesitaríamos hacer una petición a Keycloak
    // Por ahora solo confirmamos que el cliente puede limpiar sus tokens
    return c.json({
      success: true,
      message: 'Logout exitoso'
    });
  }
}

// ================================
// Rutas de Autenticación Keycloak
// ================================
export const keycloakAuthRoutes = new Hono();

// Debug middleware para keycloak routes
keycloakAuthRoutes.use('*', (c, next) => {
  console.log('🔐 [KeycloakRoutes] Petición:', c.req.method, c.req.url);
  console.log('🔐 [KeycloakRoutes] Headers:', Object.fromEntries(c.req.raw.headers.entries()));
  return next();
});

// Rutas públicas de autenticación (SIN middleware de auth)
keycloakAuthRoutes.post('/auth/keycloak/login', KeycloakAuthController.login);
keycloakAuthRoutes.post('/auth/keycloak/refresh', KeycloakAuthController.refresh);
keycloakAuthRoutes.post('/auth/keycloak/logout', KeycloakAuthController.logout);

// Ruta protegida para información del usuario (CON middleware de auth)
keycloakAuthRoutes.get('/auth/keycloak/me', KeycloakAuthController.me);

export { KeycloakAuthService, KeycloakAuthController };
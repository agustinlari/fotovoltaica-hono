import * as jose from 'jose';
import { KEYCLOAK_CERTS_URL, KEYCLOAK_USERINFO_URL } from '../config/env.js';

// Cache para las claves públicas de Keycloak
let keycloakJWKS: jose.JSONWebKeySet | null = null;
let jwksLastFetched = 0;
const JWKS_CACHE_DURATION = 300000; // 5 minutos en milisegundos

/**
 * Obtiene las claves públicas JWKS de Keycloak
 */
async function getKeycloakJWKS(): Promise<jose.JSONWebKeySet> {
  const now = Date.now();
  
  // Usar cache si es válido
  if (keycloakJWKS && (now - jwksLastFetched) < JWKS_CACHE_DURATION) {
    return keycloakJWKS;
  }

  try {
    console.log('🔐 [KeycloakHelper] Obteniendo JWKS de:', KEYCLOAK_CERTS_URL);
    
    const response = await fetch(KEYCLOAK_CERTS_URL);
    
    if (!response.ok) {
      throw new Error(`Error obteniendo JWKS: ${response.status} ${response.statusText}`);
    }
    
    keycloakJWKS = await response.json();
    jwksLastFetched = now;
    
    console.log('✅ [KeycloakHelper] JWKS obtenido correctamente');
    return keycloakJWKS as jose.JSONWebKeySet;
    
  } catch (error) {
    console.error('❌ [KeycloakHelper] Error obteniendo JWKS:', error);
    throw new Error('No se pudieron obtener las claves de Keycloak');
  }
}

/**
 * Valida y decodifica un token JWT de Keycloak
 */
export async function validateKeycloakToken(token: string): Promise<any> {
  try {
    console.log('🔐 [KeycloakHelper] Validando token...');
    
    // Obtener las claves públicas
    const jwks = await getKeycloakJWKS();
    
    // Crear el keystore local
    const localJWKS = jose.createLocalJWKSet(jwks);
    
    // Verificar y decodificar el token
    const { payload } = await jose.jwtVerify(token, localJWKS, {
      // Validaciones adicionales pueden ir aquí
      issuer: undefined, // No validamos issuer por ahora
      audience: undefined, // No validamos audience por ahora
    });

    console.log('✅ [KeycloakHelper] Token validado correctamente');
    console.log('🔐 [KeycloakHelper] Usuario:', payload.preferred_username || payload.sub);
    
    return payload;
    
  } catch (error: any) {
    console.error('❌ [KeycloakHelper] Error validando token:', error.message);
    
    if (error.code === 'ERR_JWT_EXPIRED') {
      throw new Error('Token expirado');
    }
    
    if (error.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
      throw new Error('Firma del token inválida');
    }
    
    throw new Error('Token inválido');
  }
}

/**
 * Obtiene información del usuario desde Keycloak usando el token
 */
export async function getKeycloakUserInfo(token: string): Promise<any> {
  try {
    console.log('🔐 [KeycloakHelper] Obteniendo info de usuario...');
    
    const response = await fetch(KEYCLOAK_USERINFO_URL, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error obteniendo info de usuario: ${response.status}`);
    }
    
    const userInfo = await response.json();
    
    console.log('✅ [KeycloakHelper] Info de usuario obtenida');
    return userInfo;
    
  } catch (error) {
    console.error('❌ [KeycloakHelper] Error obteniendo info de usuario:', error);
    throw error;
  }
}

/**
 * Extrae el token del header Authorization
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Middleware para validar token de Keycloak
 */
export async function validateAuthToken(token: string): Promise<any> {
  if (!token) {
    throw new Error('Token no proporcionado');
  }
  
  return await validateKeycloakToken(token);
}

/**
 * Obtiene el ID del usuario desde el header Authorization
 */
export async function getUserIdFromRequest(authHeader: string | undefined): Promise<string | null> {
  try {
    const token = extractTokenFromHeader(authHeader);
    if (!token) return null;
    
    // Si es token de desarrollo
    if (token.startsWith('dev-token-')) {
      const encodedData = token.replace('dev-token-', '');
      const decoded = JSON.parse(Buffer.from(encodedData, 'base64').toString());
      return decoded.sub || null;
    }
    
    // Para tokens reales de Keycloak
    const payload = await validateKeycloakToken(token);
    return payload.sub || null;
  } catch (error) {
    console.error('Error obteniendo usuario del token:', error);
    return null;
  }
}
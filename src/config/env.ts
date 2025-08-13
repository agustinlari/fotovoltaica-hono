import 'dotenv/config';

// Database
export const DATABASE_URL = process.env.DATABASE_URL;

// Keycloak Configuration
export const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_BASE_URL || 'http://localhost:8080';
export const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'master';
export const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || 'fotovoltaica-client';
export const KEYCLOAK_CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET;

// Keycloak URLs
export const KEYCLOAK_TOKEN_URL = `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;
export const KEYCLOAK_USERINFO_URL = `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/userinfo`;
export const KEYCLOAK_CERTS_URL = `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`;

// Server
export const PORT = process.env.PORT || 8787;

// Development
export const ENABLE_DEV_AUTH = process.env.ENABLE_DEV_AUTH === 'true';

console.log('🔧 [Config] Environment loaded:');
console.log('🔧 [Config] KEYCLOAK_BASE_URL:', KEYCLOAK_BASE_URL);
console.log('🔧 [Config] KEYCLOAK_REALM:', KEYCLOAK_REALM);
console.log('🔧 [Config] KEYCLOAK_CLIENT_ID:', KEYCLOAK_CLIENT_ID);
console.log('🔧 [Config] KEYCLOAK_TOKEN_URL:', KEYCLOAK_TOKEN_URL);
console.log('🔧 [Config] ENABLE_DEV_AUTH:', ENABLE_DEV_AUTH);
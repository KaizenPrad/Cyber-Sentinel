// This file is the environment config. It reads settings from process.env:
// Server port and environment name
// Frontend URL for CORS
// Database URL and JWT secrets
// Token expiry and cookie name
// It sits at the start of the app so every file reads config from one place.

import 'dotenv/config';
// The dotenv package loads variables from backend/.env into process.env.

// Now we get to the first major function. It Creates a Function named required
// In production missing secrets are fatal (fail fast); in development we warn
// and fall back so `npm run dev` works out of the box.
function required(name, fallback = undefined) {
  const v = process.env[name] ?? fallback; // this line reads the env var or falls back to the default value
  if (v === undefined || v === '') { // this line checks if the value is still missing or empty
    if (process.env.NODE_ENV === 'production') { // this line refuses to boot insecurely in production
      throw new Error(`[env] Missing ${name} — set it in the production environment`); // this line stops the server with a clear message
    }
    console.warn(`[env] Missing ${name} — set it in backend/.env (see .env.example)`); // this line warns you in the console so you know what to fix
  }
  return v; // this line returns the value we found
}

// Placeholder secrets must never sign production tokens.
function productionSecret(name, value) { // this line validates one secret for production use
  if (process.env.NODE_ENV !== 'production') return value; // this line skips the check outside production
  if (!value || /dev-only|change-me/i.test(value)) { // this line rejects missing or placeholder secrets
    throw new Error(`[env] ${name} is a placeholder — generate a real secret for production`); // this line stops the server with a clear message
  }
  return value; // this line returns the validated secret
}

// This is the env object that holds all our app settings in one place
export const env = {
  port: Number(process.env.PORT || 3001), // this line sets the server port, defaulting to 3001
  nodeEnv: process.env.NODE_ENV || 'development', // this line sets the environment name, defaulting to development
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173', // this line sets the frontend URL for CORS, defaulting to Vite
  databaseUrl: required('DATABASE_URL', ''), // this line reads the Postgres connection string
  jwtSecret: productionSecret('JWT_SECRET', required('JWT_SECRET', 'dev-only-secret-change-me')), // this line reads the secret used to sign access tokens
  jwtRefreshSecret: productionSecret('JWT_REFRESH_SECRET', required('JWT_REFRESH_SECRET', 'dev-only-refresh-change-me')), // this line reads the secret name for refresh tokens
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h', // this line sets how long access tokens last, defaulting to 1 hour
  tokenCookie: process.env.TOKEN_COOKIE_NAME || 'cybersentinel-token', // this line sets the cookie name that holds the token
};

if (!env.databaseUrl) { // this line refuses to boot without a database URL in any environment
  throw new Error('[env] Missing DATABASE_URL — set it in backend/.env (see .env.example)'); // this line stops the server with a clear message
}

export default env;
// The default export is env so other files can import it easily.

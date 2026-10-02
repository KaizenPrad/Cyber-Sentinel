// This file is the environment config. It reads settings from process.env:
// Server port and environment name
// Frontend URL for CORS
// Database URL and JWT secrets
// Token expiry and cookie name
// It sits at the start of the app so every file reads config from one place.

import 'dotenv/config';
// The dotenv package loads variables from backend/.env into process.env.

// Now we get to the first major function. It Creates a Function named required
function required(name, fallback = undefined) { 
  const v = process.env[name] ?? fallback; // this line reads the env var or falls back to the default value
  if (v === undefined || v === '') { // this line checks if the value is still missing or empty
    console.warn(`[env] Missing ${name} — set it in backend/.env (see .env.example)`); // this line warns you in the console so you know what to fix
  }
  return v; // this line returns the value we found
}

// This is the env object that holds all our app settings in one place
export const env = {
  port: Number(process.env.PORT || 3001), // this line sets the server port, defaulting to 3001
  nodeEnv: process.env.NODE_ENV || 'development', // this line sets the environment name, defaulting to development
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173', // this line sets the frontend URL for CORS, defaulting to Vite
  databaseUrl: required('DATABASE_URL', ''), // this line reads the Postgres connection string
  jwtSecret: required('JWT_SECRET', 'dev-only-secret-change-me'), // this line reads the secret used to sign access tokens
  jwtRefreshSecret: required('JWT_REFRESH_SECRET', 'dev-only-refresh-change-me'), // this line reads the secret name for refresh tokens
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h', // this line sets how long access tokens last, defaulting to 1 hour
  tokenCookie: process.env.TOKEN_COOKIE_NAME || 'cybersentinel-token', // this line sets the cookie name that holds the token
};

export default env;
// The default export is env so other files can import it easily.

// This file is an authentication service. It contains helper functions for:
// Hashing passwords with bcrypt
// Verifying passwords against hashes
// Signing JWT access tokens
// Generating random refresh tokens
// Making URL-friendly slugs for organizations
// Building cookie options for tokens
// Creating and hashing API keys
// It sits between the controller and the libraries so controllers stay clean.

import bcrypt from 'bcryptjs';
// The bcrypt library is used for hashing and verifying passwords.

import jwt from 'jsonwebtoken';
// The jwt library is used for creating and verifying JSON Web Tokens.

import crypto from 'crypto';
// The crypto module is built into Node.js and gives us random bytes and hashing.

import { env } from '../config/env.js';
// The env object holds our config like the JWT secret and other settings.

// Now we get to the first major function. It Creates a Export named hashPassword
export async function hashPassword(password) {
  return bcrypt.hash(password, 12); // this line hashes the password with cost factor 12 so it is safe to store
}

// This is the verifyPassword function that checks a plain password against a hash
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash); // this line compares the plain password to the stored hash and returns true or false
}

// This is the signAccessToken function that makes a JWT for a logged-in user
export function signAccessToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn }); // this line signs the payload with our secret so it expires after the configured time
}

// This is the signRefreshToken function that makes a long random refresh token
export function signRefreshToken() {
  return crypto.randomBytes(64).toString('hex'); // this line makes 64 random bytes and turns them into a 128-character hex string
}

// This is the slugify function that turns a name into a URL-friendly slug
export function slugify(name) {
  return ( // this line returns the final slug string
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) + // this line lowercases the name, swaps bad characters for dashes, trims dashes, and cuts it to 40 chars
    '-' + // this line adds a dash before the random part
    crypto.randomBytes(3).toString('hex') // this line adds 3 random bytes as hex so the slug stays unique
  );
}

// This is the cookieOptions function that builds safe cookie settings for the token
export function cookieOptions() {
  const isProd = env.nodeEnv === 'production'; // this line checks if we are running in production
  return { // this line returns the cookie options object
    httpOnly: true, // Prevent XSS attacks // this line blocks JavaScript from reading the cookie so hackers cannot steal it
    secure: isProd, // Only send over HTTPS in production // this line only sends the cookie over HTTPS when in production
    sameSite: isProd ? 'none' : 'lax', // CSRF protection // this line controls cross-site sending to help stop CSRF attacks
    maxAge: 60 * 60 * 1000, // 1 hour, matches JWT_EXPIRES_IN default // this line makes the cookie last 1 hour like the token
    path: '/', // this line makes the cookie available on every path of the site
  };
}

// This is the generateApiKey function that makes a new API key like cs_live_xxx
export function generateApiKey() {
  // Generate random key with cs_live_ prefix (like Cloudinary) // this line explains what the next line does
  const rawKey = `cs_live_${crypto.randomBytes(24).toString('base64url')}`; // this line builds the raw key with a prefix plus 24 random bytes
  // Hash the key with SHA256 for secure storage // this line explains why we hash before saving
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex'); // this line hashes the raw key with SHA256 so we never store the real key
  // Prefix for efficient database lookup (first 12 chars) // this line explains what the prefix is for
  const keyPrefix = rawKey.slice(0, 12); // cs_live_xxxx for identification // this line takes the first 12 chars so we can find keys quickly
  return { key: rawKey, keyHash, keyPrefix }; // this line returns the real key, its hash, and its prefix
}

// This is the generateInviteCode function that makes a short join code like CS-A1B2C3
export function generateInviteCode() {
  return `CS-${crypto.randomBytes(3).toString('hex').toUpperCase()}`; // 3 random bytes as uppercase hex, prefixed for readability
}

// This is the hashApiKey function that hashes a key so we can compare it later
export function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex'); // this line hashes the given key with SHA256 and returns the hex string
}

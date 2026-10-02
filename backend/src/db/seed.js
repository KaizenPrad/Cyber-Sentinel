// This file is a database seed script. It creates demo data for local testing:
// 1 demo organization called Demo SOC
// 1 demo user (demo@cybersentinel.local / Demo1234!)
// 3 demo devices (WS-101, WS-102, SRV-01)
// Run it with: npm run seed (or node src/db/seed.js)

import { pool } from "../config/db.js";
// The pool manages database connections for you.

import { hashPassword, slugify } from "../services/auth.service.js";
// These helpers hash the demo password and make a slug for the org name.

// Demo seed: 1 org + user + devices + phishing signals (triggers correlation on next ingest) // this line summarizes what the seed creates
const email = "demo@cybersentinel.local"; // this line sets the demo user email
await pool.query("DELETE FROM users WHERE email = $1", [email]); // this line deletes the old demo user if it exists so we start fresh
const orgName = "Demo SOC"; // this line sets the demo organization name
const org = (
  await pool.query(
    "INSERT INTO organizations (name, slug) VALUES ($1,$2) RETURNING *",
    [orgName, slugify(orgName)],
  )
).rows[0]; // this line creates the org and keeps the new row
const hash = await hashPassword("Demo1234!"); // this line hashes the demo password so we never store plain text
const user = (
  await pool.query(
    // this line creates the demo user and keeps the new row
    "INSERT INTO users (email, password_hash, first_name, last_name, organization_id) VALUES ($1,$2,$3,$4,$5) RETURNING *", // this line is the SQL that inserts the user
    [email, hash, "Demo", "Analyst", org.id], // this line fills in email, hash, names, and the new org id
  )
).rows[0]; // this line grabs the first (and only) new user row
await pool.query(
  "INSERT INTO organization_members (user_id, organization_id, role) VALUES ($1,$2,$3)",
  [user.id, org.id, "OWNER"],
); // this line makes the demo user an OWNER of the demo org
for (const h of ["WS-101", "WS-102", "SRV-01"]) {
  // this line loops over three demo hostnames
  await pool.query(
    "INSERT INTO devices (hostname, os, criticality, organization_id) VALUES ($1,$2,$3,$4)",
    [h, "Windows 11", 70, org.id],
  ); // this line inserts one demo device linked to the org
}
console.log(`Seeded org=${org.id} user=${email} / Demo1234!`); // this line prints the new org id and login so you can use it
await pool.end(); // this line closes all pool connections so the script can exit

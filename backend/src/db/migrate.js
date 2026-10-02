// This file is a database migrate script. It applies the schema to Postgres:
// It reads schema.sql from the same folder
// It runs the whole SQL file in one query
// Run it with: npm run migrate (or node src/db/migrate.js)

import fs from "fs";
// The fs module lets us read files from disk.

import path from "path";
// The path module helps us build file paths that work on any OS.

import { fileURLToPath } from "url";
// The fileURLToPath helper turns an import.meta.url into a normal file path.

import { pool } from "../config/db.js";
// The pool manages database connections for you.

const __dirname = path.dirname(fileURLToPath(import.meta.url)); // this line figures out the folder this script lives in
const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"); // this line reads the whole schema.sql file as text
await pool.query(sql); // this line runs all the CREATE TABLE statements against the database
console.log("Schema applied."); // this line tells you in the console that the schema worked
await pool.end(); // this line closes all pool connections so the script can exit

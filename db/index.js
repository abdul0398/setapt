import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs/promises";
import bcrypt from "bcrypt";
dotenv.config();

export async function connectToDB() {
  // Create a connection pool
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  Object.defineProperty(global, "__pool", {
    value: pool,
    writable: true,
    configurable: true,
    enumerable: true,
  });
  console.log("#####  MYSQL Connection Established Successfully #####");
  await createTables();
  console.log("#####  Tables Created Successfully #####");
}

async function createTables() {
  const tables = await fs.readdir("./models");
  for (const table of tables) {
    const tableData = await fs.readFile(`./models/${table}`, "utf8");
    await __pool.query(tableData);
  }
}

export async function createAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  const [existingAdmin] = await __pool.query(
    "SELECT * FROM users WHERE email = ?",
    [username]
  );
  if (existingAdmin.length > 0) {
    console.log("#####  Admin Already Exists #####");
    return;
  }
  // Use bcrypt to hash password - this will return a string
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Use parameterized query to safely insert the values
  const admin = await __pool.query(
    "INSERT INTO users (email, hashed_password, role) VALUES (?, ?, 'admin')",
    [username, hashedPassword.toString()]
  );
  console.log("#####  Admin Created Successfully #####");
}

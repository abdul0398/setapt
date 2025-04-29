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
  await createAdmin();
  console.log("#####  Admin Created Successfully #####");
}

async function createTables() {
  const users = await fs.readFile("./models/users.sql", "utf8");
  const events = await fs.readFile("./models/events.sql", "utf8");
  const bookings = await fs.readFile("./models/bookings.sql", "utf8");
  const availability_rules = await fs.readFile(
    "./models/availability_rules.sql",
    "utf8"
  );
  const [usersResult] = await __pool.query(users);
  const [eventsResult] = await __pool.query(events);
  const [bookingsResult] = await __pool.query(bookings);
  const [availabilityRulesResult] = await __pool.query(availability_rules);
  console.log(
    usersResult,
    eventsResult,
    bookingsResult,
    availabilityRulesResult
  );
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

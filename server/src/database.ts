
import Database from "better-sqlite3";

const db = new Database("bug-tracker.db");

// Create the users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'Developer'
  )
`);

// Create the issues table
db.exec(`
  CREATE TABLE IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// Add the assignee column to existing databases
const columns = db.prepare("PRAGMA table_info(issues)").all() as {
  name: string;
}[];

if (!columns.some((column) => column.name === "assignee_id")) {
  db.exec(`
    ALTER TABLE issues
    ADD COLUMN assignee_id INTEGER REFERENCES users(id)
  `);
}

// Add sample developers if they don't already exist
const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (name, email, role)
  VALUES (?, ?, ?)
`);

insertUser.run("Aditya", "aditya@example.com", "Developer");
insertUser.run("Aman", "aman@example.com", "Developer");
insertUser.run("Rahul", "rahul@example.com", "Tester");

export default db;

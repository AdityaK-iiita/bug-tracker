"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const database_js_1 = __importDefault(require("./database.js"));
const app = (0, express_1.default)();
const PORT = 8000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
database_js_1.default.exec(`
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_id INTEGER NOT NULL,
    author TEXT NOT NULL DEFAULT 'Administrator',
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
  )
`);
const validStatuses = [
    "Open",
    "In Progress",
    "Testing",
    "Closed",
];
app.get("/", (req, res) => {
    res.send("Bug Tracker API is running");
});
// Get all developers and testers
app.get("/api/users", (req, res) => {
    const users = database_js_1.default.prepare("SELECT * FROM users").all();
    res.json(users);
});
// Get all issues with assignee details
app.get("/api/issues", (req, res) => {
    const issues = database_js_1.default.prepare(`
    SELECT
      issues.*,
      users.name AS assignee_name
    FROM issues
    LEFT JOIN users ON issues.assignee_id = users.id
    ORDER BY issues.id DESC
  `).all();
    res.json(issues);
});
// Create a new issue
app.post("/api/issues", (req, res) => {
    const { title, description, severity } = req.body;
    if (!title || !description || !severity) {
        return res.status(400).json({
            error: "Title, description, and severity are required",
        });
    }
    const result = database_js_1.default.prepare(`
    INSERT INTO issues (title, description, severity)
    VALUES (?, ?, ?)
  `).run(title, description, severity);
    res.status(201).json({
        id: result.lastInsertRowid,
        title,
        description,
        severity,
        status: "Open",
    });
});
// Update an issue's status or developer assignment
app.patch("/api/issues/:id", (req, res) => {
    const issueId = Number(req.params.id);
    const { title, description, severity, status, assignee_id } = req.body;
    const issue = database_js_1.default.prepare("SELECT * FROM issues WHERE id = ?").get(issueId);
    if (!issue) {
        return res.status(404).json({ error: "Issue not found" });
    }
    if (title !== undefined && !String(title).trim()) {
        return res.status(400).json({ error: "Title cannot be empty" });
    }
    if (status !== undefined && !validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
    }
    const validSeverities = ["Critical", "High", "Medium", "Low"];
    if (severity !== undefined && !validSeverities.includes(severity)) {
        return res.status(400).json({ error: "Invalid severity" });
    }
    if (assignee_id !== undefined && assignee_id !== null) {
        const user = database_js_1.default.prepare("SELECT id FROM users WHERE id = ?").get(assignee_id);
        if (!user) {
            return res.status(400).json({ error: "Developer not found" });
        }
    }
    database_js_1.default.prepare(`
    UPDATE issues
    SET
      title = ?,
      description = ?,
      severity = ?,
      status = ?,
      assignee_id = ?
    WHERE id = ?
  `).run(title === undefined ? issue.title : String(title).trim(), description === undefined ? issue.description : description, severity ?? issue.severity, status ?? issue.status, assignee_id === undefined ? issue.assignee_id : assignee_id, issueId);
    const updatedIssue = database_js_1.default.prepare(`
    SELECT issues.*, users.name AS assignee_name
    FROM issues
    LEFT JOIN users ON issues.assignee_id = users.id
    WHERE issues.id = ?
  `).get(issueId);
    res.json(updatedIssue);
});
// Get comments for an issue
app.get("/api/issues/:id/comments", (req, res) => {
    const issueId = Number(req.params.id);
    const issue = database_js_1.default.prepare("SELECT id FROM issues WHERE id = ?").get(issueId);
    if (!issue) {
        return res.status(404).json({ error: "Issue not found" });
    }
    const comments = database_js_1.default.prepare(`
    SELECT id, issue_id, author, body, created_at
    FROM comments
    WHERE issue_id = ?
    ORDER BY id ASC
  `).all(issueId);
    res.json(comments);
});
// Add a comment to an issue
app.post("/api/issues/:id/comments", (req, res) => {
    const issueId = Number(req.params.id);
    const body = String(req.body.body ?? "").trim();
    const author = String(req.body.author ?? "Administrator").trim();
    const issue = database_js_1.default.prepare("SELECT id FROM issues WHERE id = ?").get(issueId);
    if (!issue) {
        return res.status(404).json({ error: "Issue not found" });
    }
    if (!body) {
        return res.status(400).json({ error: "Comment cannot be empty" });
    }
    const result = database_js_1.default.prepare(`
    INSERT INTO comments (issue_id, author, body)
    VALUES (?, ?, ?)
  `).run(issueId, author || "Administrator", body);
    const comment = database_js_1.default.prepare(`
    SELECT id, issue_id, author, body, created_at
    FROM comments
    WHERE id = ?
  `).get(result.lastInsertRowid);
    res.status(201).json(comment);
});
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

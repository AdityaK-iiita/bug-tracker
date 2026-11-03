import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";

type Issue = {
  id: number;
  title: string;
  description: string;
  severity: string;
  status: string;
  created_at: string;
  assignee_id: number | null;
  assignee_name: string | null;
};

type Comment = {
  id: number;
  issue_id: number;
  author: string;
  body: string;
  created_at: string;
};

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};

const STATUSES = ["Open", "In Progress", "Testing", "Closed"];

function App() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("Medium");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [statusFilter, setStatusFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [view, setView] = useState<"table" | "kanban">("table");
  const [draggedIssueId, setDraggedIssueId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);
  const [isEditingIssue, setIsEditingIssue] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSeverity, setEditSeverity] = useState("Medium");
  const [savingEdit, setSavingEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadIssues() {
    try {
      const response = await fetch("http://localhost:8000/api/issues");
      if (!response.ok) throw new Error("Could not load issues");

      const data: Issue[] = await response.json();
      setIssues(data);
      setError("");
    } catch {
      setError("Could not connect to the backend.");
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    try {
      const response = await fetch("http://localhost:8000/api/users");
      if (!response.ok) throw new Error("Could not load users");

      const data: User[] = await response.json();
      setUsers(data);
    } catch {
      setError("Could not load users. Check that the backend is running.");
    }
  }

  useEffect(() => {
    void loadIssues();
    void loadUsers();
  }, []);

  async function createIssue(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:8000/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, severity }),
      });

      if (!response.ok) throw new Error("Could not create issue");

      setTitle("");
      setDescription("");
      setSeverity("Medium");
      setShowForm(false);
      await loadIssues();
    } catch {
      setError("Could not create the bug. Please try again.");
    }
  }

  async function updateIssue(
    issueId: number,
    changes: { status?: string; assignee_id?: number | null }
  ) {
    try {
      const response = await fetch(
        `http://localhost:8000/api/issues/${issueId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(changes),
        }
      );

      if (!response.ok) throw new Error("Could not update issue");

      await loadIssues();
    } catch {
      setError("Could not update the issue. Please try again.");
    }
  }

  async function deleteIssue() {
    if (!selectedIssue) return;

    const confirmed = window.confirm(
      `Delete issue #${selectedIssue.id}: "${selectedIssue.title}"? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/issues/${selectedIssue.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Could not delete issue");

      setIssues((current) =>
        current.filter((issue) => issue.id !== selectedIssue.id)
      );
      setSelectedIssue(null);
      setIsEditingIssue(false);
      setComments([]);
      setError("");
    } catch {
      setError("Could not delete the issue. Please try again.");
    }
  }

  async function saveIssueEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedIssue) return;

    setSavingEdit(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/issues/${selectedIssue.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: editTitle,
            description: editDescription,
            severity: editSeverity,
          }),
        }
      );

      if (!response.ok) throw new Error("Could not save issue");

      const updatedIssue: Issue = await response.json();
      setIssues((current) =>
        current.map((issue) =>
          issue.id === updatedIssue.id ? updatedIssue : issue
        )
      );
      setSelectedIssue(updatedIssue);
      setIsEditingIssue(false);
      setError("");
    } catch {
      setError("Could not save changes. Please try again.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function loadComments(issueId: number) {
    setCommentsLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/issues/${issueId}/comments`
      );
      if (!response.ok) throw new Error("Could not load comments");
      const data: Comment[] = await response.json();
      setComments(data);
    } catch {
      setError("Could not load comments.");
    } finally {
      setCommentsLoading(false);
    }
  }

  async function addComment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedIssue || !commentText.trim()) return;

    setCommentSaving(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/issues/${selectedIssue.id}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: commentText.trim() }),
        }
      );
      if (!response.ok) throw new Error("Could not add comment");

      const newComment: Comment = await response.json();
      setComments((current) => [...current, newComment]);
      setCommentText("");
      setError("");
    } catch {
      setError("Could not add comment. Please try again.");
    } finally {
      setCommentSaving(false);
    }
  }

  const filteredIssues = issues.filter((issue) => {
    const matchesSearch = `${issue.title} ${issue.description} ${
      issue.severity
    } ${issue.status} ${issue.assignee_name ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || issue.status === statusFilter;

    const matchesSeverity =
      severityFilter === "All" || issue.severity === severityFilter;

    const matchesAssignee =
      assigneeFilter === "All" ||
      (assigneeFilter === "Unassigned"
        ? issue.assignee_id === null
        : issue.assignee_id === Number(assigneeFilter));

    return (
      matchesSearch &&
      matchesStatus &&
      matchesSeverity &&
      matchesAssignee
    );
  });

  const severityOrder: Record<string, number> = {
    Critical: 4,
    High: 3,
    Medium: 2,
    Low: 1,
  };

  const sortedIssues = [...filteredIssues].sort((a, b) => {
    switch (sortBy) {
      case "oldest":
        return (
          new Date(a.created_at.replace(" ", "T") + "Z").getTime() -
          new Date(b.created_at.replace(" ", "T") + "Z").getTime()
        );
      case "title":
        return a.title.localeCompare(b.title);
      case "severity":
        return (severityOrder[b.severity] ?? 0) -
          (severityOrder[a.severity] ?? 0);
      case "newest":
      default:
        return (
          new Date(b.created_at.replace(" ", "T") + "Z").getTime() -
          new Date(a.created_at.replace(" ", "T") + "Z").getTime()
        );
    }
  });

  const statusCounts = STATUSES.map((status) => ({
    label: status,
    count: issues.filter((issue) => issue.status === status).length,
  }));

  const severityLevels = ["Critical", "High", "Medium", "Low"];
  const severityCounts = severityLevels.map((severity) => ({
    label: severity,
    count: issues.filter((issue) => issue.severity === severity).length,
  }));

  const openCount = issues.filter((issue) => issue.status === "Open").length;
  const criticalCount = issues.filter(
    (issue) => issue.severity === "Critical"
  ).length;
  const closedCount = issues.filter(
    (issue) => issue.status === "Closed"
  ).length;

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">B</div>
          <span>BugTracker</span>
        </div>

        <div className="workspace">
          <div className="workspace-avatar">P</div>
          <div>
            <strong>Project workspace</strong>
            <span>Personal project</span>
          </div>
        </div>

        <div className="nav-section">
          <p className="nav-heading">WORKSPACE</p>
          <button className="nav-item active">
            <span>▦</span> Issues
            <span className="nav-count">{issues.length}</span>
          </button>
          <button className="nav-item" onClick={() => setSearch("")}>
            <span>◷</span> Activity
          </button>
          <button className="nav-item">
            <span>◈</span> Releases
          </button>
        </div>

        <div className="sidebar-footer">
          <div className="user-avatar">A</div>
          <div>
            <strong>Administrator</strong>
            <span>Project manager</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> Issues
          </div>
          <button
            className="primary-button"
            onClick={() => setShowForm(!showForm)}
          >
            + New issue
          </button>
        </header>

        <section className="page-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">PROJECT OVERVIEW</p>
              <h1>Issues</h1>
              <p className="subtitle">
                Track bugs, manage priorities, and ship better software.
              </p>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Total issues</span>
              <strong>{issues.length}</strong>
              <span className="stat-description">All reported bugs</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Open issues</span>
              <strong>{openCount}</strong>
              <span className="stat-description">Awaiting resolution</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Critical issues</span>
              <strong>{criticalCount}</strong>
              <span className="stat-description">
                Require immediate attention
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Resolved</span>
              <strong>{closedCount}</strong>
              <span className="stat-description">Successfully closed</span>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Issues by status</span>
              {statusCounts.map((item) => (
                <div className="stat-description" key={item.label}>
                  {item.label}: <strong>{item.count}</strong>
                </div>
              ))}
            </div>

            <div className="stat-card">
              <span className="stat-label">Issues by severity</span>
              {severityCounts.map((item) => (
                <div className="stat-description" key={item.label}>
                  {item.label}: <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          </div>

          {showForm && (
            <form className="issue-form" onSubmit={createIssue}>
              <div className="form-heading">
                <h2>Create an issue</h2>
                <button
                  type="button"
                  className="close-button"
                  onClick={() => setShowForm(false)}
                >
                  ×
                </button>
              </div>

              <input
                placeholder="Issue title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <textarea
                placeholder="Describe the bug and how to reproduce it..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
              />

              <div className="form-footer">
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                >
                  <option>Critical</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
                <button className="primary-button" type="submit">
                  Create issue
                </button>
              </div>
            </form>
          )}

          <section className="issues-section">
            <div className="section-heading">
  <div>
    <h2>All issues</h2>
    <span>{filteredIssues.length} issues shown</span>
  </div>

  <div className="view-controls">
    <button
      type="button"
      className={view === "table" ? "view-button active" : "view-button"}
      onClick={() => setView("table")}
    >
      Table
    </button>
    <button
      type="button"
      className={view === "kanban" ? "view-button active" : "view-button"}
      onClick={() => setView("kanban")}
    >
      Kanban
    </button>
  </div>

  <div className="issue-filters">
    <input
      className="search-input"
      placeholder="⌕  Search issues..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />

    <select
      aria-label="Sort issues"
      value={sortBy}
      onChange={(e) => setSortBy(e.target.value)}
    >
      <option value="newest">Newest first</option>
      <option value="oldest">Oldest first</option>
      <option value="title">Title A–Z</option>
      <option value="severity">Highest severity</option>
    </select>

    <select
      aria-label="Filter by status"
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value)}
    >
      <option value="All">All statuses</option>
      {STATUSES.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </select>

    <select
      aria-label="Filter by severity"
      value={severityFilter}
      onChange={(e) => setSeverityFilter(e.target.value)}
    >
      <option value="All">All severities</option>
      <option value="Critical">Critical</option>
      <option value="High">High</option>
      <option value="Medium">Medium</option>
      <option value="Low">Low</option>
    </select>

    <select
      aria-label="Filter by assignee"
      value={assigneeFilter}
      onChange={(e) => setAssigneeFilter(e.target.value)}
    >
      <option value="All">All assignees</option>
      <option value="Unassigned">Unassigned</option>
      {users.map((user) => (
        <option key={user.id} value={String(user.id)}>
          {user.name}
        </option>
      ))}
    </select>
  </div>
</div>

            {error && <p className="error-message">{error}</p>}

            {view === "kanban" ? (
              <div className="kanban-board">
                {STATUSES.map((status) => {
                  const columnIssues = sortedIssues.filter(
                    (issue) => issue.status === status
                  );

                  return (
                    <div
                      className="kanban-column"
                      key={status}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (draggedIssueId !== null) {
                          void updateIssue(draggedIssueId, { status });
                          setDraggedIssueId(null);
                        }
                      }}
                    >
                      <div className="kanban-column-heading">
                        <strong>{status}</strong>
                        <span>{columnIssues.length}</span>
                      </div>

                      {columnIssues.map((issue) => (
                        <article
                          className="kanban-card"
                          key={issue.id}
                          draggable
                          onDragStart={() => setDraggedIssueId(issue.id)}
                          onDragEnd={() => setDraggedIssueId(null)}
                        >
                          <span className={`badge severity-${issue.severity.toLowerCase()}`}>
                            {issue.severity}
                          </span>
                          <button
  type="button"
  className="issue-title-button"
  onClick={() => {
                                setSelectedIssue(issue);
                                setComments([]);
                                setCommentText("");
                                void loadComments(issue.id);
                              }}
>
  {issue.title}
</button>
                          <p>{issue.description}</p>
                          <div className="kanban-card-footer">
                            <span>{issue.assignee_name ?? "Unassigned"}</span>
                            <span>#{issue.id}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : (
            <div className="issue-table">
              <div className="table-header">
                <span>ISSUE</span>
                <span>SEVERITY</span>
                <span>STATUS</span>
                <span>ASSIGNEE</span>
                <span>CREATED</span>
              </div>

              {loading ? (
                <div className="empty-state">Loading issues...</div>
              ) : filteredIssues.length === 0 ? (
                <div className="empty-state">
                  {search
                    ? "No issues match your search."
                    : "No issues yet. Create your first bug report."}
                </div>
              ) : (
                sortedIssues.map((issue) => (
                  <div className="table-row" key={issue.id}>
                    <div className="issue-info">
                      <div className="issue-icon">#</div>
                      <div>
                        <button
  type="button"
  className="issue-title-button"
  onClick={() => {
                                setSelectedIssue(issue);
                                setComments([]);
                                setCommentText("");
                                void loadComments(issue.id);
                              }}
>
  {issue.title}
</button>
                        <span>{issue.description}</span>
                      </div>
                    </div>

                    <div>
                      <span
                        className={`badge severity-${issue.severity.toLowerCase()}`}
                      >
                        {issue.severity}
                      </span>
                    </div>

                    <div>
                      <select
                        value={issue.status}
                        aria-label={`Status for ${issue.title}`}
                        onChange={(event) =>
                          updateIssue(issue.id, {
                            status: event.target.value,
                          })
                        }
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <select
                        value={issue.assignee_id ?? ""}
                        aria-label={`Assignee for ${issue.title}`}
                        onChange={(event) =>
                          updateIssue(issue.id, {
                            assignee_id:
                              event.target.value === ""
                                ? null
                                : Number(event.target.value),
                          })
                        }
                      >
                        <option value="">Unassigned</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <span className="created-date">
                      {issue.created_at
                        ? new Date(
                            issue.created_at.replace(" ", "T") + "Z"
                          ).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                ))
              )}
            </div>
            )}
          </section>
        </section>
      
        {selectedIssue && (
          <div className="modal-backdrop" onClick={() => setSelectedIssue(null)}>
            <section
              className="issue-detail-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="issue-detail-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="detail-heading">
                <div>
                  <p className="eyebrow">ISSUE #{selectedIssue.id}</p>
                  <h2 id="issue-detail-title">{selectedIssue.title}</h2>
                </div>
                <button
                  type="button"
                  className="close-button"
                  aria-label="Close issue details"
                  onClick={() => {
                    setSelectedIssue(null);
                    setIsEditingIssue(false);
                  }}
                >
                  ×
                </button>
              </div>

              {isEditingIssue ? (
                <form className="issue-form" onSubmit={saveIssueEdit}>
                  <input
                    placeholder="Issue title"
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                    required
                  />
                  <textarea
                    placeholder="Describe the issue"
                    value={editDescription}
                    onChange={(event) => setEditDescription(event.target.value)}
                    rows={4}
                    required
                  />
                  <div className="form-footer">
                    <select
                      value={editSeverity}
                      onChange={(event) => setEditSeverity(event.target.value)}
                    >
                      <option>Critical</option>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                    <button
                      type="button"
                      className="close-button"
                      onClick={() => setIsEditingIssue(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="primary-button"
                      type="submit"
                      disabled={savingEdit}
                    >
                      {savingEdit ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <p className="detail-description">
                    {selectedIssue.description || "No description provided."}
                  </p>
                  <dl className="detail-fields">
                    <div><dt>Severity</dt><dd>{selectedIssue.severity}</dd></div>
                    <div><dt>Status</dt><dd>{selectedIssue.status}</dd></div>
                    <div><dt>Assignee</dt><dd>{selectedIssue.assignee_name ?? "Unassigned"}</dd></div>
                    <div>
                      <dt>Created</dt>
                      <dd>
                        {selectedIssue.created_at
                          ? new Date(selectedIssue.created_at.replace(" ", "T") + "Z").toLocaleString()
                          : "—"}
                      </dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      setEditTitle(selectedIssue.title);
                      setEditDescription(selectedIssue.description);
                      setEditSeverity(selectedIssue.severity);
                      setIsEditingIssue(true);
                    }}
                  >
                    Edit issue
                  </button>
                  <button
                    type="button"
                    className="close-button"
                    onClick={() => void deleteIssue()}
                  >
                    Delete issue
                  </button>
                </>
              )}

              <section className="comments-section">
                <h3>Comments</h3>
                {commentsLoading ? (
                  <p>Loading comments...</p>
                ) : comments.length === 0 ? (
                  <p className="empty-comments">No comments yet.</p>
                ) : (
                  <div className="comments-list">
                    {comments.map((comment) => (
                      <article className="comment-item" key={comment.id}>
                        <div className="comment-heading">
                          <strong>{comment.author}</strong>
                          <span>
                            {comment.created_at
                              ? new Date(comment.created_at.replace(" ", "T") + "Z").toLocaleString()
                              : ""}
                          </span>
                        </div>
                        <p>{comment.body}</p>
                      </article>
                    ))}
                  </div>
                )}

                <form className="comment-form" onSubmit={addComment}>
                  <textarea
                    placeholder="Write a comment..."
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    rows={3}
                    required
                  />
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={commentSaving || !commentText.trim()}
                  >
                    {commentSaving ? "Posting..." : "Add comment"}
                  </button>
                </form>
              </section>
            </section>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
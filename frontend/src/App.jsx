// App.jsx — Employee Performance Analytics System (Frontend)
// Dark Industrial Theme | Syne + Space Mono fonts

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import axios from "axios";
import "./App.css";

// ─── Config ───────────────────────────────────────────────────────────────────
const API = axios.create({ baseURL: import.meta.env.VITE_API_URL || "https://khushi-kathak-aifsd-endsem.onrender.com/api" });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Contexts ─────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);
const ToastContext = createContext(null);

const useAuth  = () => useContext(AuthContext);
const useToast = () => useContext(ToastContext);

const DEPARTMENTS = ["Development","Design","Marketing","HR","Finance","Operations","Sales","QA"];

// ─── Score helpers ────────────────────────────────────────────────────────────
const scoreColor = (s) =>
  s >= 85 ? "#4ade80" : s >= 70 ? "#f5a623" : s >= 50 ? "#60a5fa" : "#f87171";

const scoreBadge = (s) =>
  s >= 85 ? "badge-green" : s >= 70 ? "badge-amber" : s >= 50 ? "badge-blue" : "badge-red";

const scoreLabel = (s) =>
  s >= 85 ? "Excellent" : s >= 70 ? "Good" : s >= 50 ? "Average" : "Needs Work";

const deptClass = (d) => `badge dept-${d}`;

// ─── Toast Provider ───────────────────────────────────────────────────────────
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((msg, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const icons = { success: "✓", error: "✕", warning: "⚠", info: "ℹ" };

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span>{icons[t.type]}</span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Auth Provider ────────────────────────────────────────────────────────────
function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      API.get("/auth/me")
        .then((r) => setUser(r.data.user))
        .catch(() => {
          localStorage.removeItem("token");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const r = await API.post("/auth/login", { email, password });
      localStorage.setItem("token", r.data.token);
      setUser(r.data.user);
      return r.data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const signup = async (name, email, password, role) => {
    try {
      const r = await API.post("/auth/signup", { name, email, password, role });
      localStorage.setItem("token", r.data.token);
      setUser(r.data.user);
      return r.data;
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  if (loading) {
    return (
      <div className="loading-overlay" style={{ minHeight: "100vh" }}>
        <div className="spinner" />
        <span>Initializing system…</span>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Auth Pages ───────────────────────────────────────────────────────────────
function AuthPage() {
  const [tab, setTab] = useState("login");

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h2>
            <span>⬡</span> EmpIQ
          </h2>
          <p>Employee Intelligence & Analytics Platform</p>
        </div>

        <div className="tabs">
          <button className={`tab ${tab === "login"  ? "active" : ""}`} onClick={() => setTab("login")}>Sign In</button>
          <button className={`tab ${tab === "signup" ? "active" : ""}`} onClick={() => setTab("signup")}>Register</button>
        </div>

        {tab === "login" ? <LoginForm /> : <SignupForm onDone={() => setTab("login")} />}
      </div>
    </div>
  );
}

function LoginForm() {
  const { login }  = useAuth();
  const toast      = useToast();
  const [form, setForm]   = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast("Login successful. Welcome back!", "success");
    } catch (err) {
      toast(err.response?.data?.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handle}>
      <div className="form-group">
        <label className="form-label">Email <span className="required">*</span></label>
        <input className="form-input" type="email" placeholder="admin@company.com"
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      </div>
      <div className="form-group">
        <label className="form-label">Password <span className="required">*</span></label>
        <input className="form-input" type="password" placeholder="••••••••"
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
      </div>
      <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
        {loading ? <><span className="spinner" style={{ width:14,height:14 }} /> Authenticating…</> : "→ Sign In"}
      </button>
    </form>
  );
}

function SignupForm({ onDone }) {
  const { signup } = useAuth();
  const toast      = useToast();
  const [form, setForm]   = useState({ name:"", email:"", password:"", role:"hr" });
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signup(form.name, form.email, form.password, form.role);
      toast("Account created successfully!", "success");
      setTimeout(() => onDone(), 1500);
    } catch (err) {
      console.error("Signup error details:", err);
      toast(err.response?.data?.message || "Signup failed. Please check server connection.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handle}>
      <div className="form-group">
        <label className="form-label">Full Name <span className="required">*</span></label>
        <input className="form-input" type="text" placeholder="Jane Doe"
          value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Email <span className="required">*</span></label>
          <input className="form-input" type="email" placeholder="jane@company.com"
            value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required />
        </div>
        <div className="form-group">
          <label className="form-label">Role</label>
          <select className="form-select" value={form.role} onChange={(e) => setForm({...form, role: e.target.value})}>
            <option value="hr">HR</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Password <span className="required">*</span></label>
        <input className="form-input" type="password" placeholder="Minimum 6 characters"
          value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required minLength={6} />
      </div>
      <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
        {loading ? <><span className="spinner" style={{width:14,height:14}} /> Creating account…</> : "→ Create Account"}
      </button>
    </form>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const NAV = [
  { icon: "◈", label: "Dashboard",   page: "dashboard" },
  { icon: "⊕", label: "Add Employee", page: "add"       },
  { icon: "☰", label: "Employees",   page: "list"       },
  { icon: "✦", label: "AI Insights", page: "ai"         },
  { icon: "▲", label: "Rankings",    page: "rankings"   },
];

function Sidebar({ current, onNav }) {
  const { user, logout } = useAuth();
  const initials = user?.name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "??";

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1><span>⬡</span> EmpIQ</h1>
        <p>Analytics Platform</p>
      </div>

      <nav className="sidebar-nav">
        <span className="nav-label">Navigation</span>
        {NAV.map((n) => (
          <button key={n.page}
            className={`nav-item ${current === n.page ? "active" : ""}`}
            onClick={() => onNav(n.page)}>
            <span className="nav-icon">{n.icon}</span>
            <span>{n.label}</span>
          </button>
        ))}
        <span className="nav-label">System</span>
        <button className="nav-item" onClick={logout}>
          <span className="nav-icon">⏻</span>
          <span>Sign Out</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="user-badge">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <p>{user?.name}</p>
            <span>{user?.role}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ onNav }) {
  const [stats, setStats]     = useState({ total: 0, avgScore: 0, topDept: "-", excellent: 0 });
  const [recent, setRecent]   = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    API.get("/employees")
      .then((r) => {
        const emps = r.data.data;
        const total     = emps.length;
        const avgScore  = total ? Math.round(emps.reduce((a,e) => a + e.performanceScore, 0) / total) : 0;
        const excellent = emps.filter((e) => e.performanceScore >= 85).length;
        const deptCount = emps.reduce((acc, e) => { acc[e.department] = (acc[e.department]||0)+1; return acc; }, {});
        const topDept   = Object.entries(deptCount).sort((a,b) => b[1]-a[1])[0]?.[0] || "-";
        setStats({ total, avgScore, topDept, excellent });
        setRecent(emps.slice(0, 5));
      })
      .catch(err => {
        console.error("Failed to load employees:", err);
        toast("Failed to load dashboard data", "error");
      })
      .finally(() => setLoading(false));
  }, [toast]);

  if (loading) return <div className="loading-overlay"><div className="spinner"/><span>Loading…</span></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb">EmpIQ <span>/</span> Dashboard</div>
          <h2>Overview</h2>
          <p>Performance intelligence at a glance</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNav("add")}>+ Add Employee</button>
      </div>

      <div className="stats-grid">
        {[
          { label:"Total Employees", value: stats.total,     icon:"◈", sub:"Active records" },
          { label:"Avg. Performance", value: `${stats.avgScore}%`, icon:"◎", sub:"Across all staff" },
          { label:"Top Department",  value: stats.topDept,   icon:"⬡", sub:"Highest headcount" },
          { label:"Top Performers",  value: stats.excellent, icon:"✦", sub:"Score ≥ 85" },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <p className="stat-label">{s.label}</p>
            <p className="stat-value">{s.value}</p>
            <p className="stat-sub">{s.sub}</p>
            <span className="stat-icon">{s.icon}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Employees</span>
          <button className="btn btn-ghost btn-sm" onClick={() => onNav("list")}>View all →</button>
        </div>
        <div className="table-wrapper" style={{borderRadius:0,border:"none"}}>
          {recent.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">◈</div>
              <h3>No employees yet</h3>
              <p>Add your first employee to get started</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Department</th><th>Score</th><th>Experience</th><th>Skills</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((emp) => (
                  <tr key={emp._id}>
                    <td>
                      <div className="td-name">{emp.name}</div>
                      <div className="td-email">{emp.email}</div>
                    </td>
                    <td><span className={`badge ${deptClass(emp.department)}`}>{emp.department}</span></td>
                    <td>
                      <div className="score-bar-wrap">
                        <div className="score-bar">
                          <div className="score-fill" style={{ width:`${emp.performanceScore}%`, background: scoreColor(emp.performanceScore) }} />
                        </div>
                        <span className="score-label" style={{ color: scoreColor(emp.performanceScore) }}>
                          {emp.performanceScore}
                        </span>
                      </div>
                    </td>
                    <td>{emp.experience} yr{emp.experience !== 1 ? "s" : ""}</td>
                    <td style={{ maxWidth: 180 }}>
                      <div className="flex gap-2" style={{ flexWrap:"wrap" }}>
                        {emp.skills.slice(0,3).map((s) => (
                          <span key={s} className="skill-tag">{s}</span>
                        ))}
                        {emp.skills.length > 3 && <span className="badge badge-gray">+{emp.skills.length - 3}</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Employee Form ────────────────────────────────────────────────────────────
function EmployeeForm({ onSuccess, editData = null }) {
  const toast   = useToast();
  const isEdit  = !!editData;

  const [form, setForm] = useState({
    name: editData?.name || "",
    email: editData?.email || "",
    department: editData?.department || "",
    skills: editData?.skills || [],
    performanceScore: editData?.performanceScore ?? "",
    experience: editData?.experience ?? "",
  });
  const [skillInput, setSkillInput] = useState("");
  const [loading, setLoading]       = useState(false);
  const [errors, setErrors]         = useState({});

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !form.skills.includes(s)) {
      setForm((f) => ({ ...f, skills: [...f.skills, s] }));
    }
    setSkillInput("");
  };

  const removeSkill = (s) =>
    setForm((f) => ({ ...f, skills: f.skills.filter((x) => x !== s) }));

  const validate = () => {
    const errs = {};
    if (!form.name.trim())       errs.name = "Name is required";
    if (!form.email.trim())      errs.email = "Email is required";
    if (!form.department)        errs.department = "Department is required";
    if (form.skills.length === 0) errs.skills = "Add at least one skill";
    if (form.performanceScore === "" || form.performanceScore < 0 || form.performanceScore > 100)
      errs.performanceScore = "Score must be 0–100";
    if (form.experience === "" || form.experience < 0)
      errs.experience = "Experience must be ≥ 0";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handle = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = { ...form, performanceScore: Number(form.performanceScore), experience: Number(form.experience) };
      if (isEdit) {
        await API.put(`/employees/${editData._id}`, payload);
        toast("Employee updated successfully", "success");
      } else {
        await API.post("/employees", payload);
        toast("Employee added successfully", "success");
        setForm({ name:"", email:"", department:"", skills:[], performanceScore:"", experience:"" });
        setSkillInput("");
      }
      onSuccess?.();
    } catch (err) {
      toast(err.response?.data?.message || "Operation failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handle}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Full Name <span className="required">*</span></label>
          <input className="form-input" value={form.name} placeholder="Aman Verma"
            onChange={(e) => setForm({...form, name: e.target.value})} />
          {errors.name && <p className="form-error">{errors.name}</p>}
        </div>
        <div className="form-group">
          <label className="form-label">Email <span className="required">*</span></label>
          <input className="form-input" type="email" value={form.email} placeholder="aman@company.com"
            onChange={(e) => setForm({...form, email: e.target.value})} />
          {errors.email && <p className="form-error">{errors.email}</p>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Department <span className="required">*</span></label>
          <select className="form-select" value={form.department}
            onChange={(e) => setForm({...form, department: e.target.value})}>
            <option value="">Select department…</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          {errors.department && <p className="form-error">{errors.department}</p>}
        </div>
        <div className="form-group">
          <label className="form-label">Performance Score <span className="required">*</span></label>
          <input className="form-input" type="number" min="0" max="100" value={form.performanceScore}
            placeholder="0 – 100"
            onChange={(e) => setForm({...form, performanceScore: e.target.value})} />
          {errors.performanceScore && <p className="form-error">{errors.performanceScore}</p>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Years of Experience <span className="required">*</span></label>
          <input className="form-input" type="number" min="0" value={form.experience}
            placeholder="e.g. 3"
            onChange={(e) => setForm({...form, experience: e.target.value})} />
          {errors.experience && <p className="form-error">{errors.experience}</p>}
        </div>
        <div className="form-group">
          <label className="form-label">Score Preview</label>
          {form.performanceScore !== "" ? (
            <div style={{ display:"flex", alignItems:"center", gap:10, height:42 }}>
              <div className="score-bar" style={{ width:"100%" }}>
                <div className="score-fill" style={{ width:`${form.performanceScore}%`, background: scoreColor(Number(form.performanceScore)) }} />
              </div>
              <span className={`badge ${scoreBadge(Number(form.performanceScore))}`}>
                {scoreLabel(Number(form.performanceScore))}
              </span>
            </div>
          ) : <p className="text-muted" style={{ fontSize:"0.75rem", paddingTop:10 }}>Enter score above</p>}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Skills <span className="required">*</span></label>
        <div className="skills-input-wrapper">
          {form.skills.map((s) => (
            <span key={s} className="skill-tag">
              {s} <button type="button" onClick={() => removeSkill(s)}>×</button>
            </span>
          ))}
          <input
            className="skills-input"
            value={skillInput}
            placeholder={form.skills.length ? "Add more…" : "Type skill and press Enter…"}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
          />
        </div>
        <p className="form-hint">Press Enter to add a skill</p>
        {errors.skills && <p className="form-error">{errors.skills}</p>}
      </div>

      <div className="flex gap-3 mt-4" style={{ justifyContent:"flex-end" }}>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? <><span className="spinner" style={{width:14,height:14}} /> Saving…</> : isEdit ? "✓ Update Employee" : "✓ Add Employee"}
        </button>
      </div>
    </form>
  );
}

// ─── Add Employee Page ────────────────────────────────────────────────────────
function AddEmployeePage() {
  const [done, setDone] = useState(false);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb">EmpIQ <span>/</span> Add Employee</div>
          <h2>Register Employee</h2>
          <p>Add a new team member to the analytics system</p>
        </div>
      </div>

      {done && (
        <div className="toast toast-success mb-4" style={{ position:"relative", pointerEvents:"all", maxWidth:"100%", marginBottom:20 }}>
          ✓ Employee registered successfully!
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">Employee Registration Form</span>
        </div>
        <div className="card-body">
          <EmployeeForm onSuccess={() => setDone(true)} />
        </div>
      </div>
    </div>
  );
}

// ─── Employee List Page ───────────────────────────────────────────────────────
function EmployeeListPage() {
  const toast  = useToast();
  const [employees, setEmployees] = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [editEmployee, setEditEmployee] = useState(null);
  const [deleteId, setDeleteId]   = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    API.get("/employees")
      .then((r) => {
        setEmployees(r.data.data);
        setFiltered(r.data.data);
      })
      .catch(err => {
        console.error("Failed to load employees:", err);
        toast("Failed to load employees", "error");
      })
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let res = [...employees];
    if (deptFilter) res = res.filter((e) => e.department === deptFilter);
    if (search)     res = res.filter((e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.skills.some((s) => s.toLowerCase().includes(search.toLowerCase()))
    );
    setFiltered(res);
  }, [search, deptFilter, employees]);

  const handleDelete = async () => {
    try {
      await API.delete(`/employees/${deleteId}`);
      toast("Employee deleted", "success");
      setDeleteId(null);
      load();
    } catch (err) {
      toast("Delete failed", "error");
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb">EmpIQ <span>/</span> Employees</div>
          <h2>All Employees</h2>
          <p>{employees.length} total records</p>
        </div>
      </div>

      <div className="search-bar">
        <div className="search-input-wrap">
          <span className="search-icon">⌕</span>
          <input className="form-input" placeholder="Search by name, email, skill…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 180 }}
          value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          <option value="">All Departments</option>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        {(search || deptFilter) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(""); setDeptFilter(""); }}>
            ✕ Clear
          </button>
        )}
      </div>

      <div className="card">
        <div className="table-wrapper" style={{ borderRadius: 0, border: "none" }}>
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /><span>Loading employees…</span></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">◈</div>
              <h3>No employees found</h3>
              <p>{search || deptFilter ? "Try adjusting your filters" : "Add your first employee to get started"}</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Employee</th><th>Department</th><th>Performance</th><th>Experience</th><th>Skills</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => (
                  <tr key={emp._id}>
                    <td><div className="td-name">{emp.name}</div><div className="td-email">{emp.email}</div></td>
                    <td><span className={`badge ${deptClass(emp.department)}`}>{emp.department}</span></td>
                    <td>
                      <div className="score-bar-wrap">
                        <div className="score-bar"><div className="score-fill" style={{ width:`${emp.performanceScore}%`, background: scoreColor(emp.performanceScore) }} /></div>
                        <span className="score-label" style={{ color: scoreColor(emp.performanceScore) }}>{emp.performanceScore}</span>
                      </div>
                    </td>
                    <td>{emp.experience} yr{emp.experience !== 1 ? "s" : ""}</td>
                    <td><div className="flex gap-2" style={{ flexWrap:"wrap" }}>{emp.skills.slice(0,3).map((s) => <span key={s} className="skill-tag">{s}</span>)}{emp.skills.length > 3 && <span className="badge badge-gray">+{emp.skills.length-3}</span>}</div></td>
                    <td><div className="flex gap-2"><button className="btn-icon" onClick={() => setEditEmployee(emp)}>✎</button><button className="btn-icon" style={{ color:"var(--red)" }} onClick={() => setDeleteId(emp._id)}>⊗</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editEmployee && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setEditEmployee(null)}>
          <div className="modal"><div className="modal-header"><h3>Edit Employee</h3><button className="btn-icon" onClick={() => setEditEmployee(null)}>✕</button></div><div className="modal-body"><EmployeeForm editData={editEmployee} onSuccess={() => { setEditEmployee(null); load(); }} /></div></div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 420 }}><div className="modal-header"><h3>Confirm Delete</h3><button className="btn-icon" onClick={() => setDeleteId(null)}>✕</button></div><div className="modal-body"><p style={{ color:"var(--text-secondary)" }}>This action is permanent. The employee record will be removed from the system.</p></div><div className="modal-footer"><button className="btn btn-ghost btn-sm" onClick={() => setDeleteId(null)}>Cancel</button><button className="btn btn-danger btn-sm" onClick={handleDelete}>⊗ Delete</button></div></div>
        </div>
      )}
    </div>
  );
}

// ─── AI Insights Page ─────────────────────────────────────────────────────────
function AIInsightsPage() {
  const toast = useToast();
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [genLoading, setGenLoading] = useState(false);
  const [empLoading, setEmpLoading] = useState(true);

  useEffect(() => {
    API.get("/employees").then((r) => setEmployees(r.data.data)).catch(err => console.error("Failed to load employees:", err)).finally(() => setEmpLoading(false));
  }, []);

  const toggle = (id) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const generate = async () => {
    if (selected.length === 0) { toast("Select at least one employee", "warning"); return; }
    setGenLoading(true);
    try {
      const r = await API.post("/ai/recommend", { employeeIds: selected });
      setRecommendation(r.data);
      toast("AI recommendation generated!", "success");
    } catch (err) { toast(err.response?.data?.message || "AI generation failed. Check API key.", "error"); } 
    finally { setGenLoading(false); }
  };

  return (
    <div>
      <div className="page-header"><div className="page-header-left"><div className="page-breadcrumb">EmpIQ <span>/</span> AI Insights</div><h2>AI Recommendations</h2><p>Select employees to generate AI-powered performance insights</p></div><button className="btn btn-primary" onClick={generate} disabled={genLoading || selected.length === 0}>{genLoading ? <><span className="spinner" style={{width:14,height:14}} /> Generating…</> : `✦ Generate (${selected.length})`}</button></div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1.5fr", gap:24 }}>
        <div className="card"><div className="card-header"><span className="card-title">Select Employees</span><span className="badge badge-amber">{selected.length} selected</span></div><div style={{ maxHeight:500, overflowY:"auto", padding:"8px 12px" }}>{empLoading ? <div className="loading-overlay"><div className="spinner" /></div> : employees.length === 0 ? <div className="empty-state"><p>No employees found</p></div> : employees.map((emp) => { const isOn = selected.includes(emp._id); return (<div key={emp._id} onClick={() => toggle(emp._id)} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", cursor:"pointer", borderRadius:8, marginBottom:4, background: isOn ? "var(--amber-glow-sm)" : "transparent", border: `1px solid ${isOn ? "rgba(245,166,35,0.3)" : "transparent"}` }}><div style={{ width:18, height:18, borderRadius:4, border: `2px solid ${isOn ? "var(--amber)" : "var(--border-light)"}`, background: isOn ? "var(--amber)" : "transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.65rem", color:"#000", flexShrink:0 }}>{isOn ? "✓" : ""}</div><div style={{ flex:1 }}><p style={{ fontSize:"0.82rem", fontWeight:600 }}>{emp.name}</p><p style={{ fontSize:"0.68rem", color:"var(--text-muted)" }}>{emp.department} · {emp.performanceScore}%</p></div><span className={`badge ${scoreBadge(emp.performanceScore)}`}>{emp.performanceScore}</span></div>); })}</div><div style={{ padding:"12px 20px", borderTop:"1px solid var(--border)", display:"flex", gap:8 }}><button className="btn btn-ghost btn-sm" onClick={() => setSelected(employees.map((e) => e._id))}>Select All</button><button className="btn btn-ghost btn-sm" onClick={() => setSelected([])}>Clear</button></div></div>
        <div>{recommendation ? (<div className="ai-panel"><div className="ai-panel-header"><div className="ai-pulse" /><h3>✦ AI Analysis Complete</h3><span className="badge badge-green" style={{ marginLeft:"auto" }}>{new Date(recommendation.generatedAt).toLocaleTimeString()}</span></div><div className="ai-content">{recommendation.recommendation}</div></div>) : (<div className="ai-panel" style={{ minHeight:400, display:"flex", alignItems:"center", justifyContent:"center" }}><div className="empty-state"><div className="empty-icon" style={{ fontSize:"3rem", opacity:0.3 }}>✦</div><h3>No analysis yet</h3><p>Select employees and click Generate</p></div></div>)}</div>
      </div>
    </div>
  );
}

// ─── Rankings Page ────────────────────────────────────────────────────────────
function RankingsPage() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/ai/rankings").then((r) => setRankings(r.data.data)).catch(err => console.error("Failed to load rankings:", err)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-overlay"><div className="spinner" /><span>Loading rankings…</span></div>;

  return (
    <div>
      <div className="page-header"><div className="page-header-left"><div className="page-breadcrumb">EmpIQ <span>/</span> Rankings</div><h2>Performance Rankings</h2><p>Employees ranked by performance score and experience</p></div></div>
      {rankings.length === 0 ? <div className="empty-state"><div className="empty-icon">▲</div><h3>No data</h3></div> : <div className="rank-list">{rankings.map((emp) => (<div className="rank-item" key={emp.id}><span className={`rank-num ${emp.rank <= 3 ? `top-${emp.rank}` : ""}`}>{emp.rank <= 3 ? ["🥇","🥈","🥉"][emp.rank-1] : `#${emp.rank}`}</span><div className="rank-info"><div className="rank-name">{emp.name}</div><div className="rank-dept"><span className={`badge badge-sm ${deptClass(emp.department)}`}>{emp.department}</span> &nbsp; {emp.experience} yr{emp.experience!==1?"s":""} exp · {emp.skills.slice(0,3).join(", ")}</div></div><div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:16 }}><span style={{ fontSize:"0.72rem", color:"var(--text-secondary)", maxWidth:140, textAlign:"right" }}>{emp.badge}</span><div className="rank-score"><div className="score-num" style={{ color: scoreColor(emp.performanceScore) }}>{emp.performanceScore}</div><div className="score-suffix">/100</div></div></div></div>))}</div>}
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
function AppShell() {
  const { user } = useAuth();
  const [page, setPage] = useState("dashboard");

  if (!user) return <AuthPage />;

  const pages = { dashboard: <Dashboard onNav={setPage} />, add: <AddEmployeePage />, list: <EmployeeListPage />, ai: <AIInsightsPage />, rankings: <RankingsPage /> };

  return (<div className="app-wrapper"><Sidebar current={page} onNav={setPage} /><main className="main-content">{pages[page] || <Dashboard onNav={setPage} />}</main></div>);
}

export default function App() {
  return (<ToastProvider><AuthProvider><AppShell /></AuthProvider></ToastProvider>);
}
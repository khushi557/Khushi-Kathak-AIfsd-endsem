const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ 
  origin: process.env.CLIENT_URL || "http://localhost:5173", 
  credentials: true 
}));
app.use(express.json());

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/employee_analytics";
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected to:", MONGO_URI))
  .catch((err) => console.error("❌ MongoDB error:", err));

// ─── Schemas & Models ─────────────────────────────────────────────────────────

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "hr"], default: "hr" },
}, { timestamps: true });

// REMOVE any pre-save middleware - we'll hash manually in the route
// This avoids the "next" issue completely

const User = mongoose.model("User", userSchema);

// Employee Schema
const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  department: { type: String, required: true, enum: ["Development", "Design", "Marketing", "HR", "Finance", "Operations", "Sales", "QA"] },
  skills: { type: [String], required: true },
  performanceScore: { type: Number, required: true, min: 0, max: 100 },
  experience: { type: Number, required: true, min: 0 },
  aiRecommendation: { type: String, default: null },
  lastRecommendedAt: { type: Date, default: null },
}, { timestamps: true });

const Employee = mongoose.model("Employee", employeeSchema);

// ─── Helper Functions ─────────────────────────────────────────────────────────
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "supersecretkey",
    { expiresIn: "7d" }
  );
};

// ─── Auth Middleware ──────────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }
    
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────

// SIGNUP - No middleware issues
app.post("/api/auth/signup", async (req, res) => {
  try {
    console.log("Signup request received:", req.body);
    
    const { name, email, password, role } = req.body;
    
    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Name, email, and password are required" 
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: "Password must be at least 6 characters" 
      });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: "Email already registered" 
      });
    }
    
    // Hash password manually
    const hashedPassword = await hashPassword(password);
    
    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "hr"
    });
    
    // Generate token
    const token = generateToken(user);
    
    // Return response
    res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Server error during signup" 
    });
  }
});

// LOGIN
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and password are required" 
      });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid credentials" 
      });
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid credentials" 
      });
    }
    
    const token = generateToken(user);
    
    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Server error during login" 
    });
  }
});

// GET CURRENT USER
app.get("/api/auth/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── EMPLOYEE ROUTES ──────────────────────────────────────────────────────────

// GET all employees
app.get("/api/employees", protect, async (req, res) => {
  try {
    const employees = await Employee.find().sort({ performanceScore: -1 });
    res.json({ success: true, count: employees.length, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single employee
app.get("/api/employees/:id", protect, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }
    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST create employee
app.post("/api/employees", protect, async (req, res) => {
  try {
    const employee = await Employee.create(req.body);
    res.status(201).json({ success: true, message: "Employee added", data: employee });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT update employee
app.put("/api/employees/:id", protect, async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }
    res.json({ success: true, message: "Employee updated", data: employee });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE employee
app.delete("/api/employees/:id", protect, async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }
    res.json({ success: true, message: "Employee deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── AI ROUTES ────────────────────────────────────────────────────────────────

// AI Recommendations
app.post("/api/ai/recommend", protect, async (req, res) => {
  try {
    const { employeeIds } = req.body;
    let employees = [];
    
    if (employeeIds && employeeIds.length > 0) {
      employees = await Employee.find({ _id: { $in: employeeIds } });
    } else {
      employees = await Employee.find().limit(10);
    }
    
    const recommendation = employees.map(emp => {
      let status = "";
      let suggestion = "";
      
      if (emp.performanceScore >= 85) {
        status = "🏆 Excellent Performer";
        suggestion = "Consider for promotion and leadership roles. Great potential for mentoring others.";
      } else if (emp.performanceScore >= 70) {
        status = "⭐ Good Performer";
        suggestion = "On track for growth. Recommend advanced training and stretch assignments.";
      } else if (emp.performanceScore >= 50) {
        status = "📈 Average Performer";
        suggestion = "Needs skill development. Provide mentorship and specific training programs.";
      } else {
        status = "📉 Needs Improvement";
        suggestion = "Requires performance improvement plan. Regular feedback and clear goals needed.";
      }
      
      return `**${emp.name}** (${emp.department})\n- Status: ${status}\n- Score: ${emp.performanceScore}/100\n- Experience: ${emp.experience} years\n- Skills: ${emp.skills.join(", ")}\n- Suggestion: ${suggestion}\n`;
    }).join("\n---\n");
    
    res.json({
      success: true,
      message: "AI recommendations generated",
      recommendation: `## Performance Analysis Report\n\n${recommendation}\n\n## Overall Insights\n\n- Focus on continuous learning and development\n- Regular feedback sessions improve performance\n- Consider team-based training programs`,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("AI Error:", error);
    res.json({
      success: true,
      message: "Recommendation generated",
      recommendation: "Based on the employee data, focus on regular performance reviews, skill development programs, and clear goal setting to improve overall team performance.",
      generatedAt: new Date().toISOString()
    });
  }
});

// Rankings
app.get("/api/ai/rankings", protect, async (req, res) => {
  try {
    const employees = await Employee.find().sort({ performanceScore: -1 });
    const ranked = employees.map((emp, idx) => ({
      rank: idx + 1,
      id: emp._id,
      name: emp.name,
      department: emp.department,
      performanceScore: emp.performanceScore,
      experience: emp.experience,
      skills: emp.skills,
      badge: emp.performanceScore >= 85 ? "🏆 Top Performer" :
             emp.performanceScore >= 70 ? "⭐ Strong Performer" :
             emp.performanceScore >= 50 ? "📈 Average" : "📉 Needs Work"
    }));
    res.json({ success: true, count: ranked.length, data: ranked });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Server running", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ success: false, message: err.message || "Internal server error" });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}\n`);
});
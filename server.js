```javascript
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Supabase setup
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Local JSON file (temporary for dashboard/admin routes)
const DATA_FILE = "data.json";

// Helpers
function load(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file));
}

function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Home route
app.get("/", (req, res) => {
  res.send("SMS App live 🚀");
});

// SIGNUP ROUTE (Supabase)
app.post("/signup", async (req, res) => {
  try {

    const {
      firstName,
      lastName,
      email,
      phone,
      smsOptin,
      emailOptin
    } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // Duplicate check
    const { data: existingUsers, error: existingError } = await supabase
      .from("users")
      .select("*")
      .or(`email.eq.${email},phone.eq.${phone}`);

    if (existingError) {
      throw existingError;
    }

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email or phone already exists"
      });
    }

    // Insert into Supabase
    const { error } = await supabase
      .from("users")
      .insert([
        {
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          sms_opt_in: smsOptin,
          email_opt_in: emailOptin
        }
      ]);

    if (error) {
      throw error;
    }

    // Optional local backup
    const users = load(DATA_FILE);

    users.push({
      id: Date.now(),
      firstName,
      lastName,
      email,
      phone,
      smsOptin,
      emailOptin
    });

    save(DATA_FILE, users);

    res.json({
      success: true
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Server error"
    });

  }
});

// Get users (temporary local JSON)
app.get("/users", (req, res) => {
  res.json(load(DATA_FILE));
});

// Update user
app.post("/users/update", (req, res) => {

  const users = load(DATA_FILE);

  const updated = users.map(u =>
    u.id === req.body.id
      ? { ...u, ...req.body }
      : u
  );

  save(DATA_FILE, updated);

  res.json({ success: true });

});

// Delete user
app.post("/users/delete", (req, res) => {

  const users = load(DATA_FILE);

  const filtered = users.filter(
    u => u.id !== req.body.id
  );

  save(DATA_FILE, filtered);

  res.json({ success: true });

});

// Admin login
app.post("/admin-login", (req, res) => {

  if (req.body.password === ADMIN_PASSWORD) {
    return res.json({ success: true });
  }

  res.status(401).json({
    success: false
  });

});

// Start server
app.listen(PORT, () => {
  console.log(`Running on ${PORT}`);
});
```

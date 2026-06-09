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

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// Local backup
const DATA_FILE = "data.json";

// Helpers
function load(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file));
}

function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Home
app.get("/", (req, res) => {
  res.send("SMS App live 🚀");
});
app.get("/test-auth", async (req, res) => {

  try {

    const { data, error } =
      await supabaseAdmin.auth.admin.createUser({
        email: `test${Date.now()}@morningmessage.com`,
        email_confirm: false
      });

    if (error) {
      throw error;
    }

    console.log("AUTH UID:", data.user.id);

    res.json(data);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message
    });

  }

});

app.get("/test-invite", async (req, res) => {

  try {

    const email = `invite${Date.now()}@example.com`;

    const { data, error } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(
        email
      );

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      email,
      data
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message
    });

  }

});

// Signup route
app.post("/signup", async (req, res) => {

  console.log("New signup:", new Date().toISOString());

  try {

    // Framer field mapping
    const firstName = req.body.Name?.[0]?.trim() || "";
    const lastName = req.body.Name?.[1]?.trim() || "";

   const email = (req.body.Email || "").trim().toLowerCase();

   const phone = (req.body["Full Phone Number"] || "") .replace(/[^\d+]/g, "");

    const smsOptin = req.body.sms_opt_in === "on";
    const emailOptin = req.body.email_opt_in === "on";
    const privacyAccepted = req.body.privacy_accepted === "on";
    if (!email.includes("@")) { return res.status(400).json({ success: false, message: "Invalid email" }); }

    // Validation
    if (!firstName || !lastName || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // Existing users
    const { data: existingUsers, error: existingError } =
      await supabase
        .from("users")
        .select("*");

    if (existingError) {
      throw existingError;
    }

    // Duplicate check
    const duplicateUser = existingUsers.find(
      user =>
        user.email === email ||
        user.phone === phone
    );

    if (duplicateUser) {
      return res.status(400).json({
        success: false,
        message: "Email or phone already exists"
      });
    }

    // Create Auth User
const { data: authData, error: authError } =
  await supabaseAdmin.auth.admin.createUser({
    email: email,
    email_confirm: false
  });

if (authError) {

  console.log("AUTH ERROR:", authError);

  return res.status(400).json({
    success: false,
    message: authError.message
  });

}

const authUid = authData.user.id;

console.log("NEW AUTH UID:", authUid);

    // Insert into Supabase
const { error } = await supabase
  .from("users")
  .insert([
    {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone,
        auth_uid: authUid,
        sms_opt_in: smsOptin,
        email_opt_in: emailOptin,
        privacy_accepted: privacyAccepted,
        signup_source: "website"
    }
  ]);

if (error) {
  console.log("SUPABASE ERROR:", error);

  if (error.code === "23505") {
    return res.status(400).json({
      success: false,
      message: "Email or phone already in use"
    });
  }

  throw error;
}

    // Local backup
    const users = load(DATA_FILE);

    users.push({
  id: Date.now(),
  firstName,
  lastName,
  email,
  phone,
  smsOptin,
  emailOptin,
  privacyAccepted
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

// Get users
app.get("/users", (req, res) => {
  res.json(load(DATA_FILE));
});

// Update user
app.post("/users/update", (req, res) => {

  const users = load(DATA_FILE);

  const updated = users.map(user =>
    user.id === req.body.id
      ? { ...user, ...req.body }
      : user
  );

  save(DATA_FILE, updated);

  res.json({
    success: true
  });

});

// Delete user
app.post("/users/delete", (req, res) => {

  const users = load(DATA_FILE);

  const filtered = users.filter(
    user => user.id !== req.body.id
  );

  save(DATA_FILE, filtered);

  res.json({
    success: true
  });

});

// Admin login
app.post("/admin-login", (req, res) => {

  if (req.body.password === ADMIN_PASSWORD) {
    return res.json({
      success: true
    });
  }

  res.status(401).json({
    success: false
  });

});

// Start server
app.listen(PORT, () => {
  console.log(`Running on ${PORT}`);
});
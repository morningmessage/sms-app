const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { DateTime } = require("luxon");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("Website"));

const DATA_FILE = "data.json";
const CALENDAR_FILE = "calendar.json";

/* ---------------- HELPERS ---------------- */

function load(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file));
}

function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

/* ---------------- SIGNUP ---------------- */

app.post("/signup", (req, res) => {

  const users = load(DATA_FILE);

  const { email, phone, smsOptin, emailOptin, timezone } = req.body;

  if (!email || !phone) {
    return res.status(400).json({ error: "Missing fields" });
  }

  users.push({
    id: Date.now(),
    email,
    phone,
    smsOptin: !!smsOptin,
    emailOptin: !!emailOptin,
    timezone: timezone || "America/Los_Angeles"
  });

  save(DATA_FILE, users);

  res.json({ success: true });
});

/* ---------------- USERS ---------------- */

app.get("/users", (req, res) => {
  res.json(load(DATA_FILE));
});

app.post("/users/update", (req, res) => {

  const users = load(DATA_FILE);

  const { id, email, phone, smsOptin, emailOptin } = req.body;

  const updated = users.map(u =>
    u.id === id
      ? { ...u, email, phone, smsOptin, emailOptin }
      : u
  );

  save(DATA_FILE, updated);

  res.json({ success: true });
});

/* ---------------- CALENDAR ---------------- */

app.get("/calendar", (req, res) => {
  res.json(load(CALENDAR_FILE));
});

app.post("/calendar", (req, res) => {

  const events = load(CALENDAR_FILE);

  const { text, date } = req.body;

  if (!text || !date) {
    return res.status(400).json({ error: "Missing fields" });
  }

  events.push({
    id: Date.now(),
    text,
    date,
    sentUsers: [],
    lastSentHour: null
  });

  save(CALENDAR_FILE, events);

  res.json({ success: true });
});

app.post("/calendar/update", (req, res) => {

  const events = load(CALENDAR_FILE);

  const { id, text, date } = req.body;

  const updated = events.map(e =>
    e.id === id ? { ...e, text, date } : e
  );

  save(CALENDAR_FILE, updated);

  res.json({ success: true });
});

app.post("/calendar/delete", (req, res) => {

  const events = load(CALENDAR_FILE);

  const { id } = req.body;

  const filtered = events.filter(e => e.id !== id);

  save(CALENDAR_FILE, filtered);

  res.json({ success: true });
});

/* ---------------- ADMIN ---------------- */

const ADMIN_PASSWORD = "1234";

app.post("/admin-login", (req, res) => {

  const { password } = req.body;

  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true });
  }

  res.status(401).json({ success: false });
});

/* ---------------- AUTOMATION ENGINE ---------------- */

function checkScheduledMessages() {

  const users = load(DATA_FILE);
  const events = load(CALENDAR_FILE);

  const nowUTC = DateTime.utc();

  let changed = false;

  events.forEach(event => {

    const sentKey = event.lastSentHour;

    users.forEach(user => {

      if (!user.smsOptin || !user.phone) return;

      const userNow = nowUTC.setZone(user.timezone);

      const hourKey = userNow.toFormat("yyyy-MM-dd-HH");

      const is6AM = userNow.hour === 6;

      // prevent duplicate sending within same hour block
      if (event.sentUsers.includes(user.phone)) return;
      if (!is6AM) return;

      if (event.lastSentHour === hourKey) return;

      console.log("📨 SENDING MESSAGE");
      console.log("To:", user.phone);
      console.log("Message:", event.text);

      event.sentUsers.push(user.phone);
      event.lastSentHour = hourKey;

      changed = true;

    });

  });

  if (changed) {
    save(CALENDAR_FILE, events);
  }
}

/* ---------------- RUN LOOP ---------------- */

setInterval(checkScheduledMessages, 60000);

/* ---------------- SERVER ---------------- */

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

/* ---------------- HEALTH ---------------- */

app.get("/", (req, res) => {
  res.send("SMS App is live 🚀");
});
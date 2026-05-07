const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { DateTime } = require("luxon");

const app = express();

app.use(cors());
app.use(express.json());

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

  const {
    email,
    phone,
    smsOptin,
    emailOptin,
    timezone
  } = req.body;

  users.push({
    id: Date.now(),
    email,
    phone,
    smsOptin,
    emailOptin,
    timezone: timezone || "America/Los_Angeles"
  });

  save(DATA_FILE, users);

  res.json({ success: true });
});

/* ---------------- GET EVENTS ---------------- */

app.get("/calendar", (req, res) => {
  const events = load(CALENDAR_FILE);
  res.json(events);
});

/* ---------------- CREATE EVENT (ADMIN ONLY) ---------------- */

app.post("/calendar", (req, res) => {

  const events = load(CALENDAR_FILE);

  const { text, date } = req.body;

  events.push({
    id: Date.now(),
    text,
    date,
    sentUsers: [] // IMPORTANT: track who already received it
  });

  save(CALENDAR_FILE, events);

  res.json({ success: true });
});

/* ---------------- UPDATE EVENT ---------------- */

app.post("/calendar/update", (req, res) => {

  const events = load(CALENDAR_FILE);

  const { id, text, date } = req.body;

  const updated = events.map(e =>
    e.id === id ? { ...e, text, date } : e
  );

  save(CALENDAR_FILE, updated);

  res.json({ success: true });
});

/* ---------------- DELETE EVENT ---------------- */

app.post("/calendar/delete", (req, res) => {

  const events = load(CALENDAR_FILE);

  const { id } = req.body;

  const filtered = events.filter(e => e.id !== id);

  save(CALENDAR_FILE, filtered);

  res.json({ success: true });
});

/* ---------------- AUTOMATION ENGINE ---------------- */

function checkScheduledMessages() {

  const users = load(DATA_FILE);
  const events = load(CALENDAR_FILE);

  const nowUTC = DateTime.utc();

  let changed = false;

  events.forEach(event => {

    users.forEach(user => {

      if (!user.smsOptin) return;
      if (!user.phone) return;

      // ensure sentUsers exists
      if (!event.sentUsers) event.sentUsers = [];

      // skip if already sent to this user
      if (event.sentUsers.includes(user.phone)) return;

      const userNow = nowUTC.setZone(user.timezone);

      const is6AM = userNow.hour === 6;

      if (is6AM) {

        console.log("📨 SENDING MESSAGE");
        console.log("To:", user.phone);
        console.log("Message:", event.text);

        // mark as sent to this user
        event.sentUsers.push(user.phone);

        changed = true;
      }

    });

  });

  if (changed) {
    save(CALENDAR_FILE, events);
  }
}

/* ---------------- RUN EVERY MINUTE ---------------- */

setInterval(checkScheduledMessages, 60000);

/* ---------------- START SERVER ---------------- */

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
app.get("/", (req, res) => {
  res.send("SMS App is live 🚀");
});
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { DateTime } = require("luxon");

const app = express();

app.use(cors());
app.use(express.json());

// SERVE WEBSITE FILES
app.use(express.static("Website"));

const DATA_FILE = "data.json";
const CALENDAR_FILE = "calendar.json";

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD;

/* ---------------- HELPERS ---------------- */

function load(file) {

  if (!fs.existsSync(file)) {
    return [];
  }

  return JSON.parse(
    fs.readFileSync(file)
  );
}

function save(file, data) {

  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2)
  );
}

/* ---------------- HOME ---------------- */

app.get("/", (req, res) => {

  res.sendFile(
    __dirname + "/Website/index.html"
  );

});

/* ---------------- ADMIN LOGIN ---------------- */

app.post("/admin-login", (req, res) => {

  const { password } = req.body;

  if (password === ADMIN_PASSWORD) {

    res.json({
      success: true
    });

  } else {

    res.status(401).json({
      success: false,
      message: "Wrong password"
    });

  }

});

/* ---------------- SIGNUP ---------------- */

app.post("/signup", (req, res) => {

  const users = load(DATA_FILE);

  const {

    firstName,
    lastName,
    email,
    phone,
    smsOptin,
    emailOptin,
    timezone

  } = req.body;

  // REQUIRED FIELDS

  if (
    !firstName ||
    !lastName ||
    !email ||
    !phone
  ) {

    return res.status(400).json({
      success: false,
      message: "All fields are required."
    });

  }

  // DUPLICATE EMAIL

  const existingEmail = users.find(
    u =>
      u.email &&
      u.email.toLowerCase() ===
      email.toLowerCase()
  );

  if (existingEmail) {

    return res.status(400).json({
      success: false,
      message: "Email already exists."
    });

  }

  // DUPLICATE PHONE

  const existingPhone = users.find(
    u => u.phone === phone
  );

  if (existingPhone) {

    return res.status(400).json({
      success: false,
      message: "Phone number already exists."
    });

  }

  // CREATE USER

  const newUser = {

    id: Date.now(),

    firstName,
    lastName,

    email,
    phone,

    smsOptin,
    emailOptin,

    timezone:
      timezone ||
      "America/Los_Angeles",

    createdAt:
      new Date().toISOString()

  };

  users.push(newUser);

  save(DATA_FILE, users);

  res.json({
    success: true
  });

});

/* ---------------- GET USERS ---------------- */

app.get("/users", (req, res) => {

  const users = load(DATA_FILE);

  res.json(users);

});

/* ---------------- UPDATE USER ---------------- */

app.post("/users/update", (req, res) => {

  const users = load(DATA_FILE);

  const {

    id,
    firstName,
    lastName,
    email,
    phone,
    smsOptin,
    emailOptin

  } = req.body;

  // REQUIRED

  if (
    !firstName ||
    !lastName ||
    !email ||
    !phone
  ) {

    return res.status(400).json({
      success: false,
      message: "All fields are required."
    });

  }

  // CHECK DUPLICATE EMAIL

  const duplicateEmail = users.find(
    u =>
      u.id !== id &&
      u.email &&
      u.email.toLowerCase() ===
      email.toLowerCase()
  );

  if (duplicateEmail) {

    return res.status(400).json({
      success: false,
      message: "Email already in use."
    });

  }

  // CHECK DUPLICATE PHONE

  const duplicatePhone = users.find(
    u =>
      u.id !== id &&
      u.phone === phone
  );

  if (duplicatePhone) {

    return res.status(400).json({
      success: false,
      message: "Phone already in use."
    });

  }

  // UPDATE USER

  const updated = users.map(user =>

    user.id === id

      ? {

          ...user,

          firstName,
          lastName,

          email,
          phone,

          smsOptin,
          emailOptin

        }

      : user

  );

  save(DATA_FILE, updated);

  res.json({
    success: true
  });

});

/* ---------------- DELETE USER ---------------- */

app.post("/users/delete", (req, res) => {

  const users = load(DATA_FILE);

  const { id } = req.body;

  const filtered = users.filter(
    user => user.id !== id
  );

  save(DATA_FILE, filtered);

  res.json({
    success: true
  });

});

/* ---------------- GET CALENDAR EVENTS ---------------- */

app.get("/calendar", (req, res) => {

  const events = load(CALENDAR_FILE);

  res.json(events);

});

/* ---------------- CREATE EVENT ---------------- */

app.post("/calendar", (req, res) => {

  const events = load(CALENDAR_FILE);

  const {

    text,
    date

  } = req.body;

  if (!text || !date) {

    return res.status(400).json({
      success: false,
      message: "Text and date required."
    });

  }

  events.push({

    id: Date.now(),

    text,
    date,

    sentUsers: []

  });

  save(CALENDAR_FILE, events);

  res.json({
    success: true
  });

});

/* ---------------- UPDATE EVENT ---------------- */

app.post("/calendar/update", (req, res) => {

  const events = load(CALENDAR_FILE);

  const {

    id,
    text,
    date

  } = req.body;

  const updated = events.map(event =>

    event.id === id

      ? {
          ...event,
          text,
          date
        }

      : event

  );

  save(CALENDAR_FILE, updated);

  res.json({
    success: true
  });

});

/* ---------------- DELETE EVENT ---------------- */

app.post("/calendar/delete", (req, res) => {

  const events = load(CALENDAR_FILE);

  const { id } = req.body;

  const filtered = events.filter(
    event => event.id !== id
  );

  save(CALENDAR_FILE, filtered);

  res.json({
    success: true
  });

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

      if (!event.sentUsers) {
        event.sentUsers = [];
      }

      if (
        event.sentUsers.includes(
          user.phone
        )
      ) return;

      const userNow =
        nowUTC.setZone(
          user.timezone
        );

      const is6AM =
        userNow.hour === 6;

      if (is6AM) {

        console.log(
          "📨 SENDING MESSAGE"
        );

        console.log(
          "To:",
          user.phone
        );

        console.log(
          "Message:",
          event.text
        );

        event.sentUsers.push(
          user.phone
        );

        changed = true;

      }

    });

  });

  if (changed) {

    save(
      CALENDAR_FILE,
      events
    );

  }

}

/* ---------------- RUN EVERY MINUTE ---------------- */

setInterval(
  checkScheduledMessages,
  60000
);

/* ---------------- START SERVER ---------------- */

const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );

});
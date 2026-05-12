const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json());

const DATA_FILE = "data.json";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function load(file) {
if (!fs.existsSync(file)) return [];
return JSON.parse(fs.readFileSync(file));
}

function save(file, data) {
fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

app.get("/", (req, res) => {
res.send("SMS App live 🚀");
});

app.post("/signup", (req, res) => {

const users = load(DATA_FILE);

const { firstName, lastName, email, phone, smsOptin, emailOptin } = req.body;

if (users.find(u => u.email === email)) {
return res.status(400).json({ message: "Email exists" });
}

if (users.find(u => u.phone === phone)) {
return res.status(400).json({ message: "Phone exists" });
}

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

res.json({ success: true });

});

app.get("/users", (req, res) => {
res.json(load(DATA_FILE));
});

app.post("/users/update", (req, res) => {

const users = load(DATA_FILE);

const updated = users.map(u =>
u.id === req.body.id ? { ...u, ...req.body } : u
);

save(DATA_FILE, updated);

res.json({ success: true });

});

app.post("/users/delete", (req, res) => {

const users = load(DATA_FILE);

const filtered = users.filter(u => u.id !== req.body.id);

save(DATA_FILE, filtered);

res.json({ success: true });

});

app.post("/admin-login", (req, res) => {

if (req.body.password === ADMIN_PASSWORD) {
return res.json({ success: true });
}

res.status(401).json({ success: false });

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
console.log("Running on", PORT);
});
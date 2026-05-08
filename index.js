const https = require("https");

const API = "https://sms-app-krz3.onrender.com";

/* ---------------- FETCH USERS ---------------- */

function getUsers() {
  return new Promise((resolve, reject) => {

    https.get(`${API}/users`, (res) => {

      let data = "";

      res.on("data", chunk => data += chunk);

      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });

    }).on("error", reject);

  });
}

/* ---------------- MOCK SMS ---------------- */

function sendSMS(to, message) {
  console.log("-----");
  console.log("Sending SMS...");
  console.log("To:", to);
  console.log("Message:", message);
  console.log("-----");
}

/* ---------------- MAIN RUN ---------------- */

async function run() {

  const users = await getUsers();

  const message = process.argv.slice(2).join(" ");

  if (!message) {
    console.log("Usage: node index.js 'your message here'");
    return;
  }

  const smsUsers = users.filter(u => u.smsOptin && u.phone);

  console.log(`Sending to ${smsUsers.length} users...`);

  smsUsers.forEach(user => {
    sendSMS(user.phone, message);
  });

}

run().catch(console.error);
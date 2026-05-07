const readline = require('readline');

function sendSMS(to, message) {
  console.log("-----");
  console.log("Sending SMS...");
  console.log("To:", to);
  console.log("Message:", message);
  console.log("-----");
}

// your contacts
const contacts = [
  "+19165550001",
  "+19165550002",
  "+19165550003"
];

// create input interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ask for message
rl.question("Type your message: ", function(userMessage) {
  
  // send to all contacts
  for (let i = 0; i < contacts.length; i++) {
    sendSMS(contacts[i], userMessage);
  }

  rl.close();
});
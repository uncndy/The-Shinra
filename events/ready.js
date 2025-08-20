const setupIntervals = require("../tasks/interval.js");

module.exports = {
  name: "ready",
  once: true,
  execute(client) {
    console.log(`✅ ${client.user.tag} olarak giriş yapıldı!`);
    setupIntervals(client);
  }
};

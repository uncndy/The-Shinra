const setupIntervals = require("../tasks/interval.js");

module.exports = {
  name: "ready",
  once: true,
  execute(client) {
    console.log(`✅ ${client.user.tag} olarak giriş yapıldı!`);

    const updatePresence = () => {
      const guild = client.guilds.cache.first();
      if (!guild) return;

      const memberCount = guild.memberCount;
      client.user.setPresence({
        activities: [
          { name: `The Shinra | ${memberCount} üye`, type: 3 } // İzliyor
        ],
        status: "online"
      });
    };

    // Açılışta bir kere güncelle
    updatePresence();
    setupIntervals(client);
    // Üye girince/çıkınca güncelle
    client.on("guildMemberAdd", updatePresence);
    client.on("guildMemberRemove", updatePresence);
  }
};
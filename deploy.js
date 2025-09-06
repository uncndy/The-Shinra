const { REST, Routes } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
require("dotenv").config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

// Komut klasörlerini ve dosyalarını okumak için bir fonksiyon oluşturalım
function readCommands(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
        const filePath = path.join(dir, file.name);

        if (file.isDirectory()) {
            // Eğer bir klasörse, tekrar içine gir
            readCommands(filePath);
        } else if (file.isFile() && file.name.endsWith(".js")) {
            // Eğer bir .js dosyasıysa, komut olarak yükle
            const command = require(filePath);
            if ("data" in command && "execute" in command) {
                commands.push(command.data.toJSON());
            } else {
                console.log(`[UYARI] ${filePath} dosyasında 'data' veya 'execute' özelliği eksik.`);
            }
        }
    }
}

// Komut okuma işlemini başlat
readCommands(commandsPath);

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log(`Toplam ${commands.length} adet uygulama (/) komutu yenileniyor.`);
    
    const data = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    
    console.log(`✅ Başarıyla ${data.length} adet uygulama komutu yüklendi.`);
  } catch (error) {
    // Silent fail for command loading errors
  }
})();
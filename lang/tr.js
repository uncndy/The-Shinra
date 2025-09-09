const { TextDisplayBuilder } = require("discord.js");
const config = require("../config");

module.exports = {
  ownerControlText: new TextDisplayBuilder().setContent(`${config.emojis.cancel} Bu komutu kullanmak için *bot sahibi* olmalısın.`),

  modOrStaffOrJrStaffControlText: new TextDisplayBuilder().setContent( `${config.emojis.cancel} Bu komutu kullanmak için **Moderatör**, **Staff** veya **Junior Staff** rolüne sahip olmalısın veya *bot sahibi* olmalısın.`),
  
  modOrStaffControlText: new TextDisplayBuilder().setContent( `${config.emojis.cancel} Bu komutu kullanmak için **Moderatör**, **Staff** rolüne sahip olmalısın veya *bot sahibi* olmalısın.`),

  modControlText: new TextDisplayBuilder().setContent( `${config.emojis.cancel} Bu komutu kullanmak için **Moderatör** rolüne sahip olmalısın veya *bot sahibi* olmalısın.`),
};

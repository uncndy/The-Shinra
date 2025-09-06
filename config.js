const Question = require("./models/Question");

module.exports = {
    channels: {
        generalChat: "1405946096785555647" // Genel sohbet kanalı
    },
    logChannels: {
        warnLog: "1407348241632329878",                 // Uyarı takip log kanalı
        muteLog: "1406335224316690442",                 // Mute takip log kanalı
        banLog: "1406335177621377115",                  // Ban takip log kanalı
        kickLog: "1406335239852261376",                 // Kick takip log kanalı
        memberLog: "1406954780072476682",               // Üye bildirimleri log kanalı
        deletedMessage: "1406925512785395722",          // Silinen mesajlar log kanalı
        editedMessage: "1406925601331220592",           // Düzenlenen mesajlar log kanalı
        createdChannel: "1406925817715494933",          // Oluşturulan kanal log kanalı
        updatedChannel: "1406927297428062331",          // Güncellenen kanal log kanalı
        deletedChannel: "1406926112449105940",          // Silinen kanal log kanalı
        createdThread: "1406925934296039474",           // Oluşturulan altbaşlık log kanalı
        updatedThread: "1406927446716190761",           // Güncellenen altbaşlık log kanalı
        deletedThread: "1406926237158604953",           // Silinen altbaşlık log kanalı
        createdRole: "1406926048641290250",             // Oluşturulan rol log kanalı
        updatedRole: "1406927785603235940",             // Güncellenen rol log kanalı
        roleGived: "1406926908242792478",               // Rol verildi log kanalı
        roleRemoved: "1406927003617071134",             // Rol alındı log kanalı
        deletedRole: "1406926359607115776",             // Silinen rol log kanalı
        memberJoin: "1406926493212217410",              // Üye katıldı log kanalı
        memberLeave: "1406926532907368478",             // Üye ayrıldı log kanalı
        changedNick: "1406926722645102593",             // Kullanıcı adı değişti log kanalı
        serverSettingsUpdated: "1406927987668160563"    // Sunucu ayarları güncellendi log kanalı
    },
    roles: {
        muted: "1407356511533142029",                   // Susturulmuş rolü
        moderator: "1405890731591208980",               // Moderator rolü
        staff: "1413800621533823057",                   // Staff rolü
        juniorStaff: "1413800510024061000",             // Junior Staff rolü
        booster: "1405891159951151217",                 // Booster rolü
        boosterPlus: "",                                // Booster Plus rolü
        supportStaff: "1406010861331677274",            // Support Staff rolü
        eventStaff: "1406010749549019357",              // Event Staff rolü
        star: "1406955479124410481",                    // Yıldız rolü
        ownerUserID: "879126288097493003"               // Bot sahibi ID
    },
    emojis: {
        warning: "<:warning:1413475087570567268>",
        cancel: "<:cancel:1413475060303528009>",
        stats: "<:stats:1413475085120966718>",
        info: "<:info:1413475080008372324>",
        success: "<:success:1413475063679680552>",
        target: "<:target:1413483643711651923>",
        xp: "<:xp:1413519652046245888>",
        level: "<:level:1413519655435501658>",
        ping : "<:ping:1413520678640029696>",
        status: "<:status:1413521734065328310>",
        question: "<:question:1413522618396577802>",
        moderator: "<:staff:1413523777664323727>",
        time: "<:time:1413475076505866321>",
        edit: "<:edit:1413539849276882984>",
        trash: "<:trash:1413538052185260144>",
        create: "<:create:1413540304262402191>",
        give: "<:give:1413540665026936852>",
        channel: "<:channel:1413541172156301342>",
        sorumlu: "<:sorumlu:1413541304549507212>",
        update: "<:update:1413541917056041013>",
        leave: "<:leave:1413542377452474580>",
        join: "<:join:1413542379662610462>",
        member: "<:member:1413542819116875837>",
        role: "<:role:1413544110005944513>",
        server: "<:server:1413545025622642780>"
    }
};

# The Shinra Discord Bot 🚀

The Shinra Discord Bot, anime, manga, oyun ve sohbet odaklı Discord sunucuları için geliştirilmiş kapsamlı bir moderasyon ve topluluk yönetim botudur.

## 🌟 Özellikler

### 🛡️ Moderasyon Sistemi
- **Sanction Sistemi**: Birleşik uyarı, susturma, atma ve yasaklama sistemi
- **Otomatik Susturma Kaldırma**: Zamana dayalı otomatik susturma kaldırma
- **Moderasyon Logları**: Tüm moderasyon işlemlerinin detaylı logları
- **Rol Hiyerarşisi Kontrolü**: Güvenli moderasyon işlemleri

### 👥 Kullanıcı Yönetimi
- **XP ve Seviye Sistemi**: Mesaj bazlı XP kazanımı ve seviye atlama
- **Günlük Claim Sistemi**: Kullanıcıların günlük XP talep edebilmesi
- **Kullanıcı İstatistikleri**: Detaylı mesaj ve aktivite istatistikleri
- **Rol Takibi**: Kullanıcı rol değişikliklerinin otomatik takibi
- **Nickname Geçmişi**: Önceki kullanıcı adlarının kaydedilmesi

### 🔍 Güvenlik Özellikleri
- **FindCord API Entegrasyonu**: Yeni üyelerin sicil sorgulaması
- **Rate Limiting**: API çağrılarının kısıtlanması
- **Otomatik Güvenlik Kontrolleri**: Yeni üye katılımında otomatik kontroller

### 📊 Monitoring ve Performance
- **Health Check**: Bot sağlık durumu izleme
- **Performance Monitoring**: Detaylı performans metrikleri
- **Memory Monitoring**: Bellek kullanımı takibi
- **Graceful Shutdown**: Güvenli kapatma işlemleri

## 🚀 Kurulum

### Gereksinimler
- Node.js v16 veya üzeri
- MongoDB veritabanı
- Discord Bot Token
- FindCord API Key (opsiyonel)

### Kurulum Adımları

1. **Repository'yi klonlayın:**
   ```bash
   git clone <repository-url>
   cd bot
   ```

2. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   ```

3. **Environment variables ayarlayın:**
   ```bash
   cp .env.example .env
   ```
   
   `.env` dosyasını düzenleyin:
   ```env
   BOT_TOKEN=your_discord_bot_token
   CLIENT_ID=your_discord_client_id
   GUILD_ID=your_discord_guild_id
   MONGODB_URI=your_mongodb_connection_string
   FINDCORD_API=your_findcord_api_key
   NODE_ENV=development
   SILENT_MODE=false
   ```

4. **Komutları deploy edin:**
   ```bash
   node deploy.js
   ```

5. **Botu başlatın:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 📁 Proje Yapısı

```
bot/
├── commands/           # Slash komutları
│   ├── moderator/     # Moderatör komutları
│   └── public/        # Genel kullanıcı komutları
├── events/            # Discord.js event handlers
├── logs/              # Logging event handlers
├── models/            # MongoDB modelleri
├── tasks/             # Zamanlı görevler
├── utils/             # Yardımcı fonksiyonlar
├── config.js          # Bot konfigürasyonu
├── index.js           # Ana giriş noktası
└── deploy.js          # Komut deployment scripti
```

## 🔧 Konfigürasyon

`config.js` dosyasında botun temel ayarlarını yapabilirsiniz:
- Kanal ID'leri
- Rol ID'leri
- Emoji'ler
- Log kanalları

## 📋 Komutlar

### Moderatör Komutları
- `/sustur` - Kullanıcı susturma/susturma kaldırma
- `/yasak` - Kullanıcı yasaklama/yasak kaldırma
- `/uyarı` - Uyarı sistemi yönetimi
- `/at` - Kullanıcı atma
- `/sorgu` - FindCord API ile sicil sorgulama
- `/migrateroles` - Mevcut rolleri veritabanına aktarma
- `/health` - Bot sağlık durumu
- `/performance` - Performans metrikleri
- `/temizle` - Mesaj temizleme
- `/soru` - Soru sistemi yönetimi

### Genel Komutlar
- `/seviye` - Seviye ve XP görüntüleme
- `/claim` - Günlük XP talep etme
- `/istatistikler` - Kullanıcı istatistikleri
- `/user` - Detaylı kullanıcı bilgileri
- `/ping` - Bot gecikme süresi

## 🗄️ Veritabanı Modelleri

### User Model
- Kullanıcı bilgileri ve istatistikleri
- XP ve seviye sistemi
- Rol geçmişi ve nickname geçmişi
- Aktif moderasyon durumu

### Sanction Model
- Tüm moderasyon işlemlerinin kaydı
- Uyarı, susturma, atma, yasaklama
- Süre ve sebep bilgileri

### Question Model
- Soru sistemi için sorular

### MessageLog Model
- Mesaj istatistikleri için log kayıtları

## 🔐 Güvenlik

- Environment variables validation
- Rate limiting protection
- Error handling ve logging
- Graceful shutdown
- Memory leak prevention
- Production/development environment separation

## 📊 Monitoring

Bot aşağıdaki metrikleri takip eder:
- Komut çalıştırma sayıları
- API çağrı sayıları
- Yanıt süreleri
- Hata oranları
- Bellek kullanımı
- Uptime bilgileri

## 🧪 Testler

Bot kapsamlı unit testlerle test edilmiştir:

```bash
# Tüm testleri çalıştır
npm test

# Testleri watch modunda çalıştır
npm run test:watch

# Coverage raporu ile testleri çalıştır
npm run test:coverage

# Test runner script'i
node tests/run-tests.js
```

### Test Kapsamı
- ✅ **Utility Functions**: RateLimiter, HealthCheck
- ✅ **Models**: User, Sanction
- ✅ **Commands**: Ping, Health, Performance
- ✅ **Error Handling**: Tüm hata senaryoları
- ✅ **API Integration**: FindCord API mock'ları

### Test Yapısı
```
tests/
├── setup.js              # Test konfigürasyonu
├── utils/                 # Utility testleri
├── models/                # Model testleri
├── commands/              # Komut testleri
└── run-tests.js          # Test runner
```

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Testleri çalıştırın (`npm test`)
4. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
5. Branch'inizi push edin (`git push origin feature/amazing-feature`)
6. Pull Request oluşturun

## 📝 Lisans

Bu proje özel kullanım için geliştirilmiştir.

## 🆘 Destek

Herhangi bir sorun yaşarsanız:
1. GitHub Issues kullanın
2. Dokumentasyonu kontrol edin
3. `/health` komutu ile bot durumunu kontrol edin

---

**The Shinra | Ateşin Efsanesi** 🔥

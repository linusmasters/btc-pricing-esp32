#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>


#define WIFI_SSID     "SUA REDE WIFI"
#define WIFI_PASSWORD "SUA SENHA WIFI"


// ======== OLED 128x64 I2C ========
#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
#define OLED_ADDR     0x3C
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ======== HTTP (Binance) ========
const char* BINANCE_URL = "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT";
WiFiClientSecure httpsClient;  // HTTPS (insecure neste demo)

// ======== MQTT ========
const char* MQTT_HOST = "10.0.0.101";  // <-- coloque o IP do seu broker
const uint16_t MQTT_PORT = 1883;
const char* MQTT_USER = "";              // opcional
const char* MQTT_PASS = "";              // opcional

const char* MQTT_CLIENT_ID = "esp32-btc-oled";
const char* MQTT_TOPIC_PRICE = "esp32/btc/price";
const char* MQTT_TOPIC_STATUS = "esp32/btc/status";

WiFiClient mqttNet;
PubSubClient mqtt(mqttNet);

// ======== App ========
unsigned long lastUpdateMs = 0;
const unsigned long refreshIntervalMs = 60UL * 1000UL;

String lastPrice = "--";
String lastMsg   = "Boot";

// ---------- UI helpers ----------
void drawCentered(const String& l1, const String& l2="", const String& l3="") {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  int16_t x1, y1; uint16_t w, h;

  display.setTextSize(2);
  display.getTextBounds(l1, 0, 0, &x1, &y1, &w, &h);
  display.setCursor((SCREEN_WIDTH - w) / 2, 6);
  display.println(l1);

  display.setTextSize(1);
  if (l2.length()) { display.getTextBounds(l2,0,0,&x1,&y1,&w,&h); display.setCursor((SCREEN_WIDTH-w)/2, 32); display.println(l2); }
  if (l3.length()) { display.getTextBounds(l3,0,0,&x1,&y1,&w,&h); display.setCursor((SCREEN_WIDTH-w)/2, 48); display.println(l3); }

  display.display();
}

void showPrice(const String& price, const String& status) {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("BTC/USDT (Binance)");

  display.setTextSize(2);
  display.setCursor(0, 18);
  display.print("$ ");
  display.println(price);

  display.setTextSize(1);
  display.setCursor(0, 48);
  display.print("Atualiza a cada 60s");
  display.setCursor(0, 57);
  display.print(status);

  display.display();
}

// ---------- WiFi ----------
void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long t0 = millis();
  drawCentered("WiFi", "Conectando...", WIFI_SSID);

  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 20000) {
    delay(250);
  }

  if (WiFi.status() == WL_CONNECTED) {
    lastMsg = "IP " + WiFi.localIP().toString();
    drawCentered("WiFi OK", WiFi.localIP().toString(), "Inicializando...");
  } else {
    lastMsg = "WiFi falhou";
    drawCentered("WiFi", "Falhou :(", "Cheque SSID/Senha");
  }
}

// ---------- HTTP fetch ----------
bool fetchBtcPrice(String& outPrice, String& outStatus) {
  if (WiFi.status() != WL_CONNECTED) { outStatus = "Sem WiFi"; return false; }

  httpsClient.setInsecure(); // demo: sem validar certificado

  HTTPClient http;
  if (!http.begin(httpsClient, BINANCE_URL)) { outStatus = "HTTP begin falhou"; return false; }

  int code = http.GET();
  if (code != 200) { outStatus = "HTTP " + String(code); http.end(); return false; }

  String body = http.getString();
  http.end();

  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, body);
  if (err) { outStatus = "JSON invalido"; return false; }

  const char* priceStr = doc["price"];
  if (!priceStr) { outStatus = "Sem price"; return false; }

  double p = atof(priceStr);
  char buf[16];
  dtostrf(p, 0, 2, buf);             // 2 casas decimais
  outPrice = String(buf);

  outStatus = "OK " + String(millis()/1000) + "s";
  return true;
}

// ---------- MQTT ----------
void mqttEnsureConnected() {
  if (mqtt.connected()) return;

  mqtt.setBufferSize(512);
  mqtt.setKeepAlive(30);

  // Last Will (status offline)
  mqtt.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASS,
               MQTT_TOPIC_STATUS, 0, true, "offline");

  // Se falhar, tenta de novo a cada 2s
  while (!mqtt.connected()) {
    if (mqtt.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASS,
                     MQTT_TOPIC_STATUS, 0, true, "offline")) {
      mqtt.publish(MQTT_TOPIC_STATUS, "online", true); // retained
    } else {
      delay(2000);
    }
  }
}

void publishPrice(const String& price) {
  mqttEnsureConnected();

  // Envia payload simples e também JSON para quem preferir
  String json = String("{\"symbol\":\"BTCUSDT\",\"price\":") + "\"" + price + "\"" +
                ",\"ts\":" + String(millis()) + "}";

  // Publica o preço simples (retained)
  mqtt.publish(MQTT_TOPIC_PRICE, price.c_str(), true);

  // Publica o JSON em outro tópico
  String topicJson = String(MQTT_TOPIC_PRICE) + "/json";
  mqtt.publish(topicJson.c_str(), json.c_str(), true);
}
// ---------- setup/loop ----------
void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22); // SDA, SCL

  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println(F("Falha ao iniciar SSD1306"));
    for(;;);
  }

  drawCentered("ESP32", "BTC + MQTT", "OLED SSD1306");
  delay(1000);

  connectWiFi();

  mqtt.setServer(MQTT_HOST, MQTT_PORT);

  // Primeira atualização
  if (fetchBtcPrice(lastPrice, lastMsg)) {
    showPrice(lastPrice, lastMsg);
    publishPrice(lastPrice);
  } else {
    drawCentered("Erro", lastMsg, "Tentando...");
  }
  lastUpdateMs = millis();
}

void loop() {
  // Mantém a sessão MQTT
  if (!mqtt.connected()) {
    mqttEnsureConnected();
  }
  mqtt.loop();

  // Atualiza a cada 60s
  if (millis() - lastUpdateMs >= refreshIntervalMs) {
    String price, status;
    bool ok = fetchBtcPrice(price, status);
    if (ok) {
      lastPrice = price;
      lastMsg   = status;
      showPrice(lastPrice, lastMsg);
      publishPrice(lastPrice);
      Serial.printf("[OK] BTC: %s | %s\n", lastPrice.c_str(), lastMsg.c_str());
    } else {
      lastMsg = status;
      drawCentered("Erro", status, "Nova tentativa em 60s");
      Serial.printf("[ERRO] %s\n", status.c_str());
    }
    lastUpdateMs = millis();
  }

  delay(10);
}
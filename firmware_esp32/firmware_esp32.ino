#include <WiFi.h>
#include <esp_http_server.h>

#define PIR_PIN 13

// ==========================================
// CONFIGURACIÓN DE RED (MODO ACCESS POINT)
// ==========================================
const char* ssid = "ESP32_Intrusos";
const char* password = "123";

httpd_handle_t alert_httpd = NULL;
volatile bool motion_detected = false;

// Interrupción por hardware del sensor PIR
void IRAM_ATTR detectMotion() {
    motion_detected = true;
}

// ==========================================
// SERVIDOR HTTP - ENDPOINT DE ALERTAS
// ==========================================
static esp_err_t alert_handler(httpd_req_t *req) {
    // Retorna true si hubo movimiento, false si no.
    String json = motion_detected ? "{\"alert\": true}" : "{\"alert\": false}";
    motion_detected = false; // Se reinicia la bandera tras ser consultada por la App Móvil
    
    httpd_resp_set_type(req, "application/json");
    // CORS headers para evitar bloqueos
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    return httpd_resp_send(req, json.c_str(), json.length());
}

void startServer() {
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    
    if (httpd_start(&alert_httpd, &config) == ESP_OK) {
        httpd_uri_t alert_uri = { .uri = "/alert", .method = HTTP_GET, .handler = alert_handler, .user_ctx = NULL };
        httpd_register_uri_handler(alert_httpd, &alert_uri);
    }
}

void setup() {
    Serial.begin(115200);
    
    // Configurar el sensor PIR
    pinMode(PIR_PIN, INPUT_PULLDOWN);
    attachInterrupt(digitalPinToInterrupt(PIR_PIN), detectMotion, RISING);

    // Configurar WiFi en modo Punto de Acceso (SoftAP)
    WiFi.softAP(ssid, password);
    Serial.println("\n--- SISTEMA DE INTRUSOS ---");
    Serial.print("Servidor Iniciado. Red WiFi: ");
    Serial.println(ssid);
    Serial.print("IP del ESP32 (Alertas PIR): ");
    Serial.println(WiFi.softAPIP());

    startServer();
}

void loop() {
    // El servidor y el sensor PIR funcionan mediante eventos e interrupciones en el fondo.
    delay(10000); 
}

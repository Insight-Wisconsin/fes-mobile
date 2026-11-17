#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <BLE2902.h>

#define DEVICE_NAME "Divij_ESP32"

#define SERVICE_UUID "12345678-1234-1234-1234-123456789abc"
#define CHARACTERISTIC_UUID "abcdefab-1234-1234-1234-abcdefabcdef"
#define TELEMETRY_UUID "87654321-4321-4321-4321-cba987654321"

BLECharacteristic *controlCharacteristic;
BLECharacteristic *telemetryCharacteristic;

bool deviceConnected = false;

uint8_t currentIntensity = 0;
bool stimulationActive = false;
// For telemetry
uint32_t lastSentAt = 0;
uint8_t sequence = 0;

class ServerCallbacks : public BLEServerCallbacks {

  void onConnect(BLEServer *pServer) {
    deviceConnected = true;
    Serial.println("Phone connected");
  }

  void onDisconnect(BLEServer *pServer) {
    deviceConnected = false;

    stimulationActive = false;

    Serial.println("Phone disconnected");
    Serial.println("Stopping stimulation");

    BLEDevice::startAdvertising();
    Serial.println("Advertising restarted");
  }
};

void setIntensity(uint8_t value) {

  if (value > 10) {
    Serial.println("Invalid intensity ignored");
    return;
  }

  currentIntensity = value;

  Serial.print("Intensity set to: ");
  Serial.println(currentIntensity);
}

void startStimulation() {

  stimulationActive = true;

  Serial.println("Stimulation START");
}

void stopStimulation() {

  stimulationActive = false;

  Serial.println("Stimulation STOP");
}

void handleCommand(uint8_t command, uint8_t value) {

  Serial.print("Command received: ");
  Serial.print(command);
  Serial.print(" Value: ");
  Serial.println(value);

  switch (command) {

    case 0x01:
      setIntensity(value);
      break;

    case 0x02:
      startStimulation();
      break;

    case 0x03:
      stopStimulation();
      break;

    case 0x04:
      Serial.println("Ping received");
      break;

    default:
      Serial.println("Unknown command");
      break;
  }
}

class CharacteristicCallbacks : public BLECharacteristicCallbacks {

  void onWrite(BLECharacteristic *characteristic) {

    uint8_t *data = characteristic->getData();
    size_t length = characteristic->getLength();

    if (length < 2) {
      Serial.println("Invalid packet");
      return;
    }

    uint8_t command = data[0];
    uint8_t value = data[1];

    handleCommand(command, value);
  }
};

void setup() {
  Serial.begin(115200);
  Serial.println("Booting BLE controller");

  BLEDevice::init(DEVICE_NAME);

  BLEServer* server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  BLEService* service = server->createService(SERVICE_UUID);

  // App → ESP32: receives commands.
  controlCharacteristic = service->createCharacteristic(
    CHARACTERISTIC_UUID,  // Must match the command UUID configured in the app.
    BLECharacteristic::PROPERTY_WRITE |
      BLECharacteristic::PROPERTY_WRITE_NR
  );
  controlCharacteristic->setCallbacks(new CharacteristicCallbacks());

  // ESP32 → app: supports direct reads and notifications.
  telemetryCharacteristic = service->createCharacteristic(
    TELEMETRY_UUID,
    BLECharacteristic::PROPERTY_READ |
      BLECharacteristic::PROPERTY_NOTIFY
  );
  telemetryCharacteristic->addDescriptor(new BLE2902());

  service->start();

  BLEAdvertising* advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->setScanResponse(true);
  advertising->start();

  Serial.println("BLE advertising started");
}

void loop() {
  if (millis() - lastSentAt >= 1000) {
    lastSentAt = millis();

    const uint8_t batteryPercent = 90 - (sequence % 20);
    const int8_t fakeValue = -55 - (sequence % 12);
    const uint8_t packet[] = {
      batteryPercent,
      static_cast<uint8_t>(fakeValue),
      sequence++
    };

    telemetryCharacteristic->setValue(packet, sizeof(packet));
    telemetryCharacteristic->notify();
  }
}
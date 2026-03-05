import { BleManager, Device, Characteristic, State } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import { Buffer } from 'buffer';

const ESP32_DEVICE_NAME = 'Divij_ESP32';
const SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
const CHARACTERISTIC_UUID = 'abcdefab-1234-1234-1234-abcdefabcdef';

const CMD_SET_INTENSITY = 0x01;
const CMD_START_STIM = 0x02;
const CMD_STOP_STIM = 0x03;
const CMD_PING = 0x04;

export type BLEConnectionState =
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'error';

export type BLEEventCallback = (state: BLEConnectionState, message?: string) => void;

class BLEService {
  private manager: BleManager;
  private device: Device | null = null;
  private characteristic: Characteristic | null = null;
  private onStateChange: BLEEventCallback | null = null;
  private connectionState: BLEConnectionState = 'disconnected';
  private isDestroyed = false;

  constructor() {
    this.manager = new BleManager();
  }

  setStateCallback(callback: BLEEventCallback) {
    this.onStateChange = callback;
  }

  getConnectionState(): BLEConnectionState {
    return this.connectionState;
  }

  isConnected(): boolean {
    return this.connectionState === 'connected' && this.device !== null;
  }

  private updateState(state: BLEConnectionState, message?: string) {
    this.connectionState = state;
    this.onStateChange?.(state, message);
  }

  private async requestAndroidPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      return Object.values(granted).every(
        (status) => status === PermissionsAndroid.RESULTS.GRANTED
      );
    } catch {
      return false;
    }
  }

  private async waitForPoweredOn(): Promise<void> {
    const state = await this.manager.state();
    if (state === State.PoweredOn) return;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        subscription.remove();
        reject(new Error('Bluetooth did not power on in time. Check that Bluetooth is enabled.'));
      }, 10000);

      const subscription = this.manager.onStateChange((newState) => {
        if (newState === State.PoweredOn) {
          clearTimeout(timeout);
          subscription.remove();
          resolve();
        }
      }, true);
    });
  }

  async scanAndConnect(): Promise<void> {
    if (this.isDestroyed) return;

    const hasPermissions = await this.requestAndroidPermissions();
    if (!hasPermissions) {
      this.updateState('error', 'Bluetooth permissions not granted');
      return;
    }

    try {
      await this.waitForPoweredOn();
    } catch (err: any) {
      this.updateState('error', err.message);
      return;
    }

    this.updateState('scanning', 'Scanning for ESP32...');

    return new Promise((resolve, reject) => {
      const scanTimeout = setTimeout(() => {
        this.manager.stopDeviceScan();
        this.updateState('error', 'Device not found. Make sure the ESP32 is powered on.');
        reject(new Error('Scan timeout'));
      }, 15000);

      this.manager.startDeviceScan(null, null, async (error, scannedDevice) => {
        if (this.isDestroyed) {
          this.manager.stopDeviceScan();
          clearTimeout(scanTimeout);
          return;
        }

        if (error) {
          clearTimeout(scanTimeout);
          this.updateState('error', `Scan error: ${error.message}`);
          reject(error);
          return;
        }

        if (scannedDevice?.name === ESP32_DEVICE_NAME || scannedDevice?.localName === ESP32_DEVICE_NAME) {
          clearTimeout(scanTimeout);
          this.manager.stopDeviceScan();

          try {
            await this.connectToDevice(scannedDevice);
            resolve();
          } catch (connectError: any) {
            this.updateState('error', `Connection failed: ${connectError.message}`);
            reject(connectError);
          }
        }
      });
    });
  }

  private async connectToDevice(device: Device): Promise<void> {
    this.updateState('connecting', 'Connecting to ESP32...');

    const connectedDevice = await device.connect({ timeout: 10000 });
    this.device = connectedDevice;

    const discoveredDevice = await connectedDevice.discoverAllServicesAndCharacteristics();

    const services = await discoveredDevice.services();
    const targetService = services.find(
      (s) => s.uuid.toLowerCase() === SERVICE_UUID.toLowerCase()
    );

    if (!targetService) {
      throw new Error('FES service not found on device');
    }

    const characteristics = await targetService.characteristics();
    const targetChar = characteristics.find(
      (c) => c.uuid.toLowerCase() === CHARACTERISTIC_UUID.toLowerCase()
    );

    if (!targetChar) {
      throw new Error('FES characteristic not found on device');
    }

    this.characteristic = targetChar;

    connectedDevice.onDisconnected((error, disconnectedDevice) => {
      this.device = null;
      this.characteristic = null;
      this.updateState('disconnected', 'Device disconnected');
    });

    this.updateState('connected', 'Connected to ESP32');
  }

  private async writeCommand(command: number, value: number): Promise<void> {
    if (!this.characteristic || !this.device) {
      throw new Error('Not connected to device');
    }

    const packet = Buffer.from([command, value]);
    const base64Value = packet.toString('base64');

    await this.characteristic.writeWithoutResponse(base64Value);
  }

  async setIntensity(level: number): Promise<void> {
    const clamped = Math.max(0, Math.min(10, Math.round(level)));
    await this.writeCommand(CMD_SET_INTENSITY, clamped);
  }

  async startStimulation(): Promise<void> {
    await this.writeCommand(CMD_START_STIM, 0x01);
  }

  async stopStimulation(): Promise<void> {
    await this.writeCommand(CMD_STOP_STIM, 0x00);
  }

  async ping(): Promise<void> {
    await this.writeCommand(CMD_PING, 0x00);
  }

  async disconnect(): Promise<void> {
    if (this.device) {
      try {
        await this.device.cancelConnection();
      } catch {
        // Already disconnected
      }
    }
    this.device = null;
    this.characteristic = null;
    this.updateState('disconnected');
  }

  destroy() {
    this.isDestroyed = true;
    this.disconnect();
    this.manager.destroy();
  }
}

export const bleService = new BLEService();

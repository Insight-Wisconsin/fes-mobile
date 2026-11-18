import { BleManager, Device, Characteristic, State, Subscription } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid, NativeModules } from 'react-native';
import { Buffer } from 'buffer';

const ESP32_DEVICE_NAME = 'Divij_ESP32';
const SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
const CHARACTERISTIC_UUID = 'abcdefab-1234-1234-1234-abcdefabcdef';
const TELEMETRY_UUID = '87654321-4321-4321-4321-cba987654321';

const CMD_SET_INTENSITY = 0x01;
const CMD_START_STIM = 0x02;
const CMD_STOP_STIM = 0x03;
const CMD_PING = 0x04;

/**
 * react-native-ble-plx ships a native module that Expo Go does not contain.
 * Its JS entry point is side-effect free, but `new BleManager()` dereferences
 * `NativeModules.BlePlx` (see react-native-ble-plx/src/BleModule.js), so
 * constructing it inside Expo Go throws and takes the whole app down.
 *
 * Probing the same native module the library uses lets the app boot anywhere:
 * Expo Go and web get an inert service, development builds get real Bluetooth.
 */
export const isBLESupported: boolean = (() => {
  try {
    return NativeModules.BlePlx != null;
  } catch {
    // Legacy-bridge builds expose native modules through a lazy getter that
    // can throw instead of returning undefined.
    return false;
  }
})();

export const BLE_UNAVAILABLE_MESSAGE =
  Platform.OS === 'web'
    ? 'Bluetooth is not supported in the browser'
    : 'Bluetooth needs a development build';

export type BLEConnectionState =
  | 'unavailable'
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'error';

export type BLEEventCallback = (state: BLEConnectionState, message?: string) => void;

export interface BLEDeviceData {
  batteryPercent: number;
  sampleValue: number;
  packetSequence: number;
  receivedAt: number;
}

/**
 * `data` is the latest good telemetry reading, or null when there is none
 * (not connected, or nothing received yet). When `error` is set, `data` is
 * still the last good reading, so one bad packet doesn't blank the screen.
 */
export type BLEDataCallback = (data: BLEDeviceData | null, error?: string) => void;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

class BLEService {
  private manager: BleManager | null = null;
  private device: Device | null = null;
  private characteristic: Characteristic | null = null;
  private disconnectSubscription: Subscription | null = null;
  private telemetrySubscription: Subscription | null = null;
  // Bumped whenever telemetry stops, so callbacks from an old subscription are ignored.
  private telemetryGeneration = 0;
  private lastTelemetry: BLEDeviceData | null = null;
  private onStateChange: BLEEventCallback | null = null;
  private onDataChange: BLEDataCallback | null = null;
  private connectionState: BLEConnectionState = isBLESupported ? 'disconnected' : 'unavailable';
  private isDestroyed = false;

  /**
   * Builds the BleManager on first use, so that merely importing this module
   * stays safe on platforms that have no native BLE module.
   */
  private getManager(): BleManager | null {
    if (!isBLESupported || this.isDestroyed) return null;

    if (this.manager === null) {
      try {
        this.manager = new BleManager();
      } catch (err: any) {
        console.warn('[BLE] Could not initialise BleManager:', err?.message ?? err);
        return null;
      }
    }

    return this.manager;
  }

  isSupported(): boolean {
    return isBLESupported;
  }

  setStateCallback(callback: BLEEventCallback) {
    this.onStateChange = callback;
  }

  setDataCallback(callback: BLEDataCallback) {
    this.onDataChange = callback;
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

  /**
   * Resolves once Bluetooth is usable. States the user has to fix themselves
   * fail immediately with an actionable message; only the transient
   * Unknown/Resetting states wait for the timeout. On iPhone, tapping
   * "Don't Allow" on the permission prompt lands in Unauthorized.
   */
  private async waitForPoweredOn(manager: BleManager): Promise<void> {
    const blockingError = (state: State): Error | null => {
      switch (state) {
        case State.Unauthorized:
          return new Error(
            Platform.OS === 'ios'
              ? 'Bluetooth permission is off. Turn it on in Settings → FES → Bluetooth.'
              : 'Bluetooth permission is off. Allow it in the app settings.'
          );
        case State.PoweredOff:
          return new Error(
            Platform.OS === 'ios'
              ? 'Bluetooth is off. Turn it on in Control Center.'
              : 'Bluetooth is off. Turn it on in your quick settings.'
          );
        case State.Unsupported:
          return new Error('This device does not support Bluetooth Low Energy.');
        default:
          return null;
      }
    };

    const state = await manager.state();
    if (state === State.PoweredOn) return;
    const immediate = blockingError(state);
    if (immediate) throw immediate;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        subscription.remove();
        reject(new Error('Bluetooth did not power on in time. Check that Bluetooth is enabled.'));
      }, 10000);

      const subscription = manager.onStateChange((newState) => {
        if (newState === State.PoweredOn) {
          clearTimeout(timeout);
          subscription.remove();
          resolve();
          return;
        }
        const error = blockingError(newState);
        if (error) {
          clearTimeout(timeout);
          subscription.remove();
          reject(error);
        }
      }, true);
    });
  }

  async scanAndConnect(): Promise<void> {
    if (this.isDestroyed) return;

    const manager = this.getManager();
    if (manager === null) {
      this.updateState('unavailable', BLE_UNAVAILABLE_MESSAGE);
      return;
    }

    const hasPermissions = await this.requestAndroidPermissions();
    if (!hasPermissions) {
      this.updateState('error', 'Bluetooth permissions not granted');
      return;
    }

    try {
      await this.waitForPoweredOn(manager);
    } catch (err: any) {
      this.updateState('error', err.message);
      return;
    }

    this.updateState('scanning', 'Scanning for ESP32...');

    return new Promise((resolve, reject) => {
      const scanTimeout = setTimeout(() => {
        manager.stopDeviceScan();
        this.updateState('error', 'Device not found. Make sure the ESP32 is powered on.');
        reject(new Error('Scan timeout'));
      }, 15000);

      manager.startDeviceScan(null, null, async (error, scannedDevice) => {
        if (this.isDestroyed) {
          manager.stopDeviceScan();
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
          manager.stopDeviceScan();

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

    let discoveredDevice: Device;
    let hasTelemetry: boolean;
    try {
      discoveredDevice = await connectedDevice.discoverAllServicesAndCharacteristics();

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

      // Optional, so an ESP32 still running older firmware can connect and take commands.
      hasTelemetry = characteristics.some(
        (c) => c.uuid.toLowerCase() === TELEMETRY_UUID.toLowerCase()
      );
      this.characteristic = targetChar;
    } catch (error) {
      // Close the half-open link. Otherwise the ESP32 still counts as connected,
      // stops advertising, and the next scan can't find it.
      this.device = null;
      this.characteristic = null;
      try {
        await connectedDevice.cancelConnection();
      } catch {
        // Already disconnected
      }
      throw error;
    }

    // Nothing below throws, so the 'error' state from a failed connect is
    // never overwritten by this listener.
    this.disconnectSubscription?.remove();
    this.disconnectSubscription = connectedDevice.onDisconnected(() => {
      this.disconnectSubscription?.remove();
      this.disconnectSubscription = null;
      this.stopTelemetry();
      this.device = null;
      this.characteristic = null;
      this.updateState('disconnected', 'Device disconnected');
    });

    if (hasTelemetry) {
      await this.startTelemetry(discoveredDevice);
    } else {
      this.stopTelemetry();
      this.reportTelemetryError(
        'This ESP32 has no telemetry characteristic. Flash firmware/esp32_firmware.ino to read data from it.'
      );
    }

    this.updateState('connected', 'Connected to ESP32');
  }

  private async startTelemetry(device: Device): Promise<void> {
    this.stopTelemetry();
    const generation = this.telemetryGeneration;
    const isCurrent = () => generation === this.telemetryGeneration;

    try {
      this.telemetrySubscription = device.monitorCharacteristicForService(
        SERVICE_UUID,
        TELEMETRY_UUID,
        (error, characteristic) => {
          // ble-plx can still call back with "Operation was cancelled" or
          // "Device disconnected" after the subscription is removed.
          if (!isCurrent()) return;
          if (error) {
            this.reportTelemetryError(`Telemetry notification error: ${error.message}`);
            return;
          }
          if (!characteristic?.value) {
            this.reportTelemetryError('Telemetry notification contained no data');
            return;
          }
          this.publishTelemetry(characteristic.value);
        }
      );
    } catch (error) {
      this.reportTelemetryError(`Could not subscribe to telemetry: ${errorMessage(error)}`);
    }

    try {
      const currentTelemetry = await device.readCharacteristicForService(
        SERVICE_UUID,
        TELEMETRY_UUID
      );
      if (!isCurrent()) return;
      if (!currentTelemetry.value) {
        this.reportTelemetryError('ESP32 returned an empty telemetry value');
      } else {
        this.publishTelemetry(currentTelemetry.value);
      }
    } catch (error) {
      if (!isCurrent()) return;
      this.reportTelemetryError(`Could not read initial telemetry: ${errorMessage(error)}`);
    }
  }

  /** Stops listening for telemetry and clears the last reading. */
  private stopTelemetry(): void {
    this.telemetryGeneration++;
    this.telemetrySubscription?.remove();
    this.telemetrySubscription = null;
    this.lastTelemetry = null;
    this.onDataChange?.(null);
  }

  private reportTelemetryError(message: string): void {
    this.onDataChange?.(this.lastTelemetry, message);
  }

  private publishTelemetry(base64Value: string): void {
    try {
      const packet = Buffer.from(base64Value, 'base64');
      if (packet.length !== 3) {
        throw new Error(`Expected 3 telemetry bytes, received ${packet.length}`);
      }

      const batteryPercent = packet.readUInt8(0);
      if (batteryPercent > 100) {
        throw new Error(`Battery percentage is out of range: ${batteryPercent}`);
      }

      const data: BLEDeviceData = {
        batteryPercent,
        sampleValue: packet.readInt8(1),
        packetSequence: packet.readUInt8(2),
        receivedAt: Date.now(),
      };
      this.lastTelemetry = data;
      this.onDataChange?.(data);
    } catch (error) {
      this.reportTelemetryError(`Invalid ESP32 telemetry packet: ${errorMessage(error)}`);
    }
  }

  private async writeCommand(command: number, value: number): Promise<void> {
    if (!isBLESupported) {
      throw new Error(BLE_UNAVAILABLE_MESSAGE);
    }

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
    this.stopTelemetry();
    this.disconnectSubscription?.remove();
    this.disconnectSubscription = null;
    if (this.device) {
      try {
        await this.device.cancelConnection();
      } catch {
        // Already disconnected
      }
    }
    this.device = null;
    this.characteristic = null;
    this.updateState(isBLESupported ? 'disconnected' : 'unavailable');
  }

  destroy() {
    this.isDestroyed = true;
    this.disconnect();

    if (this.manager !== null) {
      this.manager.destroy();
      this.manager = null;
    }
  }
}

export const bleService = new BLEService();

// WebBluetooth connection to Granboard

import { SERVICE_UUID, NOTIFY_UUID, DEVICE_NAME } from './protocol.js';
import { createParser } from './parser.js';

const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function createConnection(onHit, onStatus) {
  let device = null;
  let autoReconnect = true;
  let reconnectAttempts = 0;

  function setStatus(status, detail) {
    onStatus({ status, detail });
  }

  async function subscribe() {
    setStatus('connecting', `Connecting to ${device.name}...`);
    const server = await device.gatt.connect();

    const service = await server.getPrimaryService(SERVICE_UUID);
    const notifyChar = await service.getCharacteristic(NOTIFY_UUID);

    const parse = createParser();

    notifyChar.addEventListener('characteristicvaluechanged', (e) => {
      const hits = parse(e.target.value);
      for (const hit of hits) {
        onHit(hit);
      }
    });

    await notifyChar.startNotifications();
    reconnectAttempts = 0;
    setStatus('connected', `Connected to ${device.name}`);
  }

  function onDisconnected() {
    if (!autoReconnect) {
      setStatus('disconnected', 'Disconnected');
      return;
    }

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      setStatus('error', 'Reconnect failed. Click Connect to retry.');
      reconnectAttempts = 0;
      return;
    }

    reconnectAttempts++;
    setStatus('connecting', `Reconnecting (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

    setTimeout(async () => {
      try {
        await subscribe();
      } catch {
        onDisconnected();
      }
    }, RECONNECT_DELAY_MS);
  }

  async function connect() {
    if (!navigator.bluetooth) {
      setStatus('error', 'WebBluetooth not supported. Use Chrome or Edge.');
      return;
    }

    autoReconnect = true;
    reconnectAttempts = 0;

    try {
      setStatus('scanning', 'Requesting Granboard...');

      device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: DEVICE_NAME }],
        optionalServices: [SERVICE_UUID],
      });

      device.addEventListener('gattserverdisconnected', onDisconnected);

      await subscribe();
    } catch (err) {
      if (err.name === 'NotFoundError') {
        setStatus('disconnected', 'No device selected');
      } else {
        setStatus('error', err.message);
      }
    }
  }

  function disconnect() {
    autoReconnect = false;
    if (device?.gatt?.connected) {
      device.gatt.disconnect();
    }
    setStatus('disconnected', 'Disconnected');
  }

  return { connect, disconnect };
}

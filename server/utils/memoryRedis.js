const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

// Shared event bus across all instances in the process
const sharedBus = new EventEmitter();
sharedBus.setMaxListeners(100);

// Shared key-value store in memory
const memoryStore = new Map();

// Local file for persisting admin settings like crashChances
const dataDir = path.resolve(__dirname, '../../data');
const chancesFilePath = path.join(dataDir, 'crashChances.json');

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch (e) {}
  }
}

class MemoryRedis extends EventEmitter {
  constructor(url) {
    super();
    this.url = url;
    this.subscribedChannels = new Set();

    // Forward bus messages if this client subscribed
    this._messageHandler = (channel, message) => {
      if (this.subscribedChannels.has(channel)) {
        this.emit('message', channel, message);
      }
    };
    sharedBus.on('message', this._messageHandler);

    setImmediate(() => {
      this.emit('connect');
      this.emit('ready');
    });
  }

  async publish(channel, message) {
    sharedBus.emit('message', channel, message);
    return 1;
  }

  async subscribe(...channels) {
    channels.forEach(ch => this.subscribedChannels.add(ch));
    return channels.length;
  }

  async unsubscribe(...channels) {
    channels.forEach(ch => this.subscribedChannels.delete(ch));
    return channels.length;
  }

  async get(key) {
    if (key === 'crashChances') {
      try {
        if (fs.existsSync(chancesFilePath)) {
          return fs.readFileSync(chancesFilePath, 'utf8');
        }
      } catch (e) {}
    }
    return memoryStore.get(key) || null;
  }

  async set(key, value) {
    memoryStore.set(key, String(value));
    if (key === 'crashChances') {
      try {
        ensureDataDir();
        fs.writeFileSync(chancesFilePath, String(value), 'utf8');
      } catch (e) {}
    }
    return 'OK';
  }

  async quit() {
    sharedBus.removeListener('message', this._messageHandler);
    return 'OK';
  }

  disconnect() {
    sharedBus.removeListener('message', this._messageHandler);
  }
}

function createRedisClient(url = process.env.REDIS_URL) {
  if (!url || url === 'memory' || url.startsWith('mock')) {
    return new MemoryRedis(url);
  }

  try {
    const Redis = require('ioredis');
    const client = new Redis(url, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      lazyConnect: false,
      enableOfflineQueue: false
    });

    client.on('error', () => {
      console.warn('[Redis] Connection failed, operating in memory mode.');
    });

    return client;
  } catch (e) {
    return new MemoryRedis(url);
  }
}

module.exports = {
  MemoryRedis,
  createRedisClient
};

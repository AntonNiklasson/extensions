import { LocalStorage } from "@raycast/api";
import { SonosState } from "@svrooij/sonos/lib/models/sonos-state";

export const coordinatorStorage = createStorage<string>({
  key: "coordinator",
  ttl: 20,
});

export const groupStorage = createStorage<string>({
  key: "active-group",
});

export const stateStorage = createStorage<SonosState>({
  key: "state",
  ttl: 5,
});

export const devicesStorage = createStorage<string[]>({
  key: "available-devices",
  ttl: 10,
});

type StorageConfig = {
  key: string;
  ttl?: number;
  serialize?: boolean;
  debug?: boolean;
};

type StorageInstance<Shape> = {
  get: () => Promise<Shape | undefined>;
  set: (value: Shape) => Promise<void>;
  clear: () => Promise<void>;
};

type StoredWrapper = {
  timestamp: number;
  data: string;
};

/**
 * Create a new slice of stored data. Supports TTL and serialization.
 */
function createStorage<Shape extends string | boolean | object>(config: StorageConfig): StorageInstance<Shape> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const log = (...message: any[]) => {
    if (config.debug) {
      console.log("[StorageInstance]", config.key, ...message);
    }
  };

  return {
    async get() {
      try {
        const raw = await LocalStorage.getItem(config.key);
        const row = JSON.parse(raw?.toString() ?? "");

        if (config.ttl && row.timestamp + config.ttl * 1000 < Date.now()) {
          log(`expired`);
          return undefined;
        }

        return config.serialize ? JSON.parse(row.data) : row.data;
      } catch (error) {
        log(`return undefined`, error);
        return undefined;
      }
    },

    async set(value: Shape) {
      log(`set`, JSON.stringify(value));

      const data = config.serialize ? JSON.stringify(value) : value;
      const row: StoredWrapper = {
        timestamp: Date.now(),
        data: data as string,
      };

      await LocalStorage.setItem(config.key, JSON.stringify(row));
    },

    async clear() {
      await LocalStorage.removeItem(config.key);
    },
  };
}

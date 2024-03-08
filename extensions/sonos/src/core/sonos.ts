import { Toast, showToast } from "@raycast/api";
import { SonosDevice, SonosManager } from "@svrooij/sonos";
import { SonosState } from "@svrooij/sonos/lib/models/sonos-state";
import { coordinatorStorage, devicesStorage, groupStorage, stateStorage } from "./storage";
import { isDefined } from "./utils";

export async function formatPlayingState(state: SonosState | null): Promise<string | null> {
  const playbackState = state?.transportState;
  const playing = ["PLAYING", "TRANSITIONING"].includes(playbackState ?? "");
  const icon = playing ? "▶︎" : "⏸";

  if (!state || playbackState === "STOPPED") {
    return null;
  }

  // This means some kind of track is playing
  if (state.mediaInfo.CurrentURIMetaData === undefined) {
    const track = state.positionInfo.TrackMetaData;

    if (track === undefined) {
      return null;
    }

    if (typeof track === "string") {
      return `${icon}${track}`;
    }

    return `${icon}${track.Title} - ${track.Artist}`;
  }

  // This means some kind of radio is playing
  const media = state.mediaInfo.CurrentURIMetaData;

  if (typeof media === "string") {
    return `${icon}${media}`;
  }

  return `${icon}${media.Title}`;
}

export async function getAvailableDevices() {
  const manager = new SonosManager();
  const cachedDeviceIps = await devicesStorage.get();

  console.log("getAvailableDevices", cachedDeviceIps);

  if (cachedDeviceIps) {
    const device = cachedDeviceIps[0];
    await manager.InitializeFromDevice(device);
  } else {
    await manager.InitializeWithDiscovery(3);
    const deviceIps = manager.Devices.map((device) => device.Host);
    await devicesStorage.set(deviceIps);
  }

  return manager.Devices;
}

type GetLatestState = (options?: { ignoreCache: boolean }) => Promise<SonosState | null>;

export const getLatestState: GetLatestState = async ({ ignoreCache } = { ignoreCache: false }) => {
  const storedState = ignoreCache ? undefined : await stateStorage.get();

  if (!storedState) {
    const coordinator = await getActiveCoordinator();

    if (coordinator === undefined) {
      await showToast({
        title: "No explicit group set",
        style: Toast.Style.Failure,
      });

      return null;
    }

    const state = await coordinator.GetState();
    await stateStorage.set(state);

    return state;
  }

  return storedState;
};

export async function getActiveCoordinator(): Promise<SonosDevice | undefined> {
  const cachedCoordinator = await coordinatorStorage.get();

  if (cachedCoordinator) {
    return new SonosDevice(cachedCoordinator);
  }

  const group = await groupStorage.get();
  const coordinator = await getGroupCoordinator(group);

  if (coordinator) {
    const meta = await coordinator.GetZoneInfo();
    await coordinatorStorage.set(meta.IPAddress);
  }

  return coordinator;
}

export async function getGroupCoordinator(group: string | undefined): Promise<SonosDevice | undefined> {
  const devices = await getAvailableDevices();

  if (devices === null) {
    return undefined;
  }

  const groups = await getAvailableGroups();
  const fallbackGroup = group === undefined && groups.length === 1 ? groups[0] : null;
  const member = devices.find((device) => device.GroupName === (fallbackGroup ?? group));
  const coordinator = member?.Coordinator;

  if (coordinator === undefined) {
    throw Error("No coordinator found");
  }

  return coordinator;
}

export async function getAvailableGroups(): Promise<string[]> {
  const devices = await getAvailableDevices();
  const groups = devices.map((device) => device.GroupName).filter(isDefined);
  const uniqueGroups = new Set<string>(groups);

  console.log({ groups });

  return Array.from(uniqueGroups);
}

import { LaunchProps, LaunchType, Toast, showToast, updateCommandMetadata } from "@raycast/api";
import { SonosDevice } from "@svrooij/sonos/lib";
import { formatPlayingState, getActiveCoordinator, getLatestState } from "./core/sonos";
import { handleCommandError, tryLaunchCommand } from "./core/utils";

export default async function Command({ launchType }: LaunchProps) {
  const userInitiated = launchType === LaunchType.UserInitiated;
  let coordinator: SonosDevice | undefined;

  try {
    coordinator = await getActiveCoordinator();
  } catch (error) {
    await handleCommandError(error);
    return;
  }

  if (!coordinator && userInitiated) {
    await tryLaunchCommand({
      name: "set-group",
      type: LaunchType.UserInitiated,
      failureMessage: `Failed to launch "Set Active Group" automatically`,
    });
  } else {
    if (coordinator && userInitiated) {
      try {
        await coordinator.TogglePlayback();
      } catch (error) {
        await showToast({
          title: "Can't toggle playback in the current state",
          style: Toast.Style.Failure,
        });
      }
    }

    const state = await getLatestState({
      ignoreCache: userInitiated,
    });
    const title = await formatPlayingState(state);

    updateCommandMetadata({
      subtitle: title ?? "",
    });
    await tryLaunchCommand({
      name: "now-playing",
      type: LaunchType.Background,
    });
  }
}

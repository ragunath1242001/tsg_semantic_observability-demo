import { useApp, useInput } from "ink";
import { useMemo, useState } from "react";

import { ApiClient } from "./api/client.js";
import { AlgorithmInstancesScreen } from "./screens/algorithm-instances.js";
import { BridgeStatusScreen } from "./screens/bridge-status.js";
import { FilesScreen } from "./screens/files.js";
import { InstanceDetailScreen } from "./screens/instance-detail.js";
import { LoginScreen } from "./screens/login.js";
import { MainMenu } from "./screens/main-menu.js";
import type { AlgorithmInstanceDto, AppConfig, UserDto } from "./types.js";

type Screen =
  | "auth"
  | "menu"
  | "files"
  | "instances"
  | "bridge-status"
  | "instance-detail";

interface AppProps {
  config: AppConfig;
}

export function App({ config }: AppProps) {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>("auth");
  const [user, setUser] = useState<UserDto | null>(null);
  const [selectedInstance, setSelectedInstance] =
    useState<AlgorithmInstanceDto | null>(null);

  const client = useMemo(
    () => new ApiClient(config.baseUrl, config.token),
    [config.baseUrl, config.token]
  );

  // Global Ctrl+C handler
  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      exit();
    }
  });

  switch (screen) {
    case "auth":
      return (
        <LoginScreen
          client={client}
          config={config}
          onComplete={(authenticatedUser) => {
            setUser(authenticatedUser);
            setScreen("menu");
          }}
          onExit={() => exit()}
        />
      );

    case "menu":
      return (
        <MainMenu
          baseUrl={config.baseUrl}
          userName={user?.name ?? null}
          onSelect={(choice) => {
            switch (choice) {
              case "files":
                setScreen("files");
                break;
              case "instances":
                setScreen("instances");
                break;
              case "bridge-status":
                setScreen("bridge-status");
                break;
              case "quit":
                exit();
                break;
            }
          }}
        />
      );

    case "files":
      return <FilesScreen client={client} onBack={() => setScreen("menu")} />;

    case "instances":
      return (
        <AlgorithmInstancesScreen
          client={client}
          onBack={() => setScreen("menu")}
          onSelect={(instance) => {
            setSelectedInstance(instance);
            setScreen("instance-detail");
          }}
        />
      );

    case "bridge-status":
      return (
        <BridgeStatusScreen client={client} onBack={() => setScreen("menu")} />
      );

    case "instance-detail":
      return (
        <InstanceDetailScreen
          client={client}
          instance={selectedInstance!}
          onBack={() => setScreen("instances")}
        />
      );
  }
}

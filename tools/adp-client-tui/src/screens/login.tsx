import { Box, Text, useInput, useStdout } from "ink";
import { useCallback, useEffect, useRef, useState } from "react";

import { performCredentialLogin } from "../api/auth.js";
import type { ApiClient } from "../api/client.js";
import { Spinner } from "../components/spinner.js";
import { TextInput } from "../components/text-input.js";
import type { AppConfig, UserDto } from "../types.js";
import { getErrorMessage } from "../utils.js";

type Phase =
  | "detecting"
  | "checking"
  | "validating-token"
  | "authenticating"
  | "need-credentials"
  | "need-totp"
  | "success"
  | "error"
  | "no-auth-options";

interface LoginScreenProps {
  client: ApiClient;
  config: AppConfig;
  onComplete: (user: UserDto | null) => void;
  onExit: () => void;
}

export function LoginScreen({
  client,
  config,
  onComplete,
  onExit
}: LoginScreenProps) {
  const [phase, setPhase] = useState<Phase>("detecting");
  const [statusMsg, setStatusMsg] = useState("Detecting API endpoint…");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { stdout } = useStdout();
  const cols = stdout?.columns ?? 80;
  const separator = "─".repeat(Math.min(60, cols - 2));

  // Credential form state
  const [username, setUsername] = useState(config.username ?? "");
  const [password, setPassword] = useState(config.password ?? "");
  const [activeField, setActiveField] = useState<"username" | "password">(
    "username"
  );

  // TOTP state
  const [totpCode, setTotpCode] = useState("");
  const totpResolveRef = useRef<((code: string) => void) | null>(null);

  // ─── Auth flow ──────────────────────────────────────────────────────────────

  const attemptLogin = useCallback(
    async (u: string, p: string) => {
      try {
        setPhase("authenticating");
        setStatusMsg("Authenticating with SSO Bridge…");

        const onTotpRequired = (): Promise<string> =>
          new Promise((resolve) => {
            totpResolveRef.current = resolve;
            setTotpCode("");
            setPhase("need-totp");
          });

        const tokenResponse = await performCredentialLogin(
          config.baseUrl,
          config.ssoUrl!,
          config.clientId,
          u,
          p,
          (msg) => setStatusMsg(msg),
          onTotpRequired
        );

        client.setToken(tokenResponse.access_token);

        const tokenValid = await client.validateToken();
        if (!tokenValid) {
          throw new Error("Token was issued but ADP did not accept it");
        }

        const user = decodeJwtUser(tokenResponse.access_token);
        setStatusMsg(`Authenticated as ${user.name}`);
        setPhase("success");
        setTimeout(() => onComplete(user), 1500);
      } catch (error: unknown) {
        setPhase("error");
        setErrorMsg(
          `Authentication failed: ${getErrorMessage(error, "Unknown error")}`
        );
      }
    },
    [client, config.ssoUrl, config.clientId, onComplete]
  );

  const runAuth = useCallback(async () => {
    try {
      // 0. Probe base URL
      setPhase("detecting");
      setStatusMsg("Detecting API endpoint…");
      try {
        await client.probeBaseUrl();
      } catch {
        setPhase("error");
        setErrorMsg(`Could not connect to ADP at ${config.baseUrl}`);
        return;
      }

      // 1. Check auth status
      setPhase("checking");
      setStatusMsg("Checking authentication…");

      let authState;
      try {
        authState = await client.getAuthState();
      } catch {
        setPhase("error");
        setErrorMsg(`Could not connect to ADP at ${config.baseUrl}`);
        return;
      }

      if (authState.state === "authenticated" && authState.user) {
        setStatusMsg("Auth disabled — proceeding…");
        setPhase("success");
        setTimeout(() => onComplete(authState.user!), 1000);
        return;
      }

      // 2. Try provided token
      if (config.token) {
        setPhase("validating-token");
        setStatusMsg("Validating provided token…");
        client.setToken(config.token);
        if (await client.validateToken()) {
          const user = decodeJwtUser(config.token);
          setStatusMsg(`Authenticated as ${user.name}`);
          setPhase("success");
          setTimeout(() => onComplete(user), 1000);
          return;
        }
        setStatusMsg("Provided token is invalid. Attempting SSO login…");
      }

      // 3. Try ADP_TOKEN env var
      const envToken = process.env["ADP_TOKEN"];
      if (envToken) {
        setPhase("validating-token");
        setStatusMsg("Validating ADP_TOKEN…");
        client.setToken(envToken);
        if (await client.validateToken()) {
          const user = decodeJwtUser(envToken);
          setStatusMsg(`Authenticated as ${user.name}`);
          setPhase("success");
          setTimeout(() => onComplete(user), 1000);
          return;
        }
      }

      // 4. SSO login
      if (config.ssoUrl) {
        const u = config.username;
        const p = config.password;
        if (u && p) {
          await attemptLogin(u, p);
        } else {
          setPhase("need-credentials");
        }
        return;
      }

      // 5. No auth options
      setPhase("no-auth-options");
    } catch (error: unknown) {
      setPhase("error");
      setErrorMsg(getErrorMessage(error, "Unknown error"));
    }
  }, [client, config, onComplete, attemptLogin]);

  useEffect(() => {
    runAuth();
  }, [runAuth]);

  // ─── Key handling for error / no-auth states ────────────────────────────────

  useInput(
    (input, key) => {
      if (phase === "error") {
        if (key.return) {
          setErrorMsg(null);
          if (config.ssoUrl) {
            setPhase("need-credentials");
          } else {
            onExit();
          }
        } else if (input === "q") {
          onExit();
        }
      }
      if (phase === "no-auth-options") {
        onExit();
      }
    },
    { isActive: phase === "error" || phase === "no-auth-options" }
  );

  // ─── Key handling for credential form ───────────────────────────────────────

  useInput(
    (_input, key) => {
      if (key.tab) {
        setActiveField((f) => (f === "username" ? "password" : "username"));
      }
      if (key.escape) {
        onExit();
      }
    },
    { isActive: phase === "need-credentials" }
  );

  // ─── Key handling for TOTP form ─────────────────────────────────────────────

  useInput(
    (_input, key) => {
      if (key.escape) {
        onExit();
      }
    },
    { isActive: phase === "need-totp" }
  );

  // ─── Render: TOTP form ──────────────────────────────────────────────────────

  if (phase === "need-totp") {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Box marginTop={1}>
          <Text bold color="cyan">
            Two-Factor Authentication
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>{separator}</Text>
        </Box>
        <Box marginTop={1}>
          <Text>
            Enter a TOTP code from your authenticator app or a recovery code.
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>code </Text>
          <TextInput
            value={totpCode}
            onChange={setTotpCode}
            onSubmit={() => {
              if (totpCode.trim() && totpResolveRef.current) {
                const resolve = totpResolveRef.current;
                totpResolveRef.current = null;
                setPhase("authenticating");
                setStatusMsg("Verifying 2FA code…");
                resolve(totpCode.trim());
              }
            }}
            isActive={true}
            placeholder="______"
          />
        </Box>
        <Box marginTop={1}>
          <Text dimColor>{separator}</Text>
        </Box>
        <Box>
          <Text dimColor>enter submit · esc quit</Text>
        </Box>
      </Box>
    );
  }

  // ─── Render: credential form ────────────────────────────────────────────────

  if (phase === "need-credentials") {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Box marginTop={1}>
          <Text bold color="cyan">
            SSO Bridge Login
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>{separator}</Text>
        </Box>
        <Box marginTop={1} flexDirection="column">
          <Box>
            <Text dimColor>username </Text>
            <TextInput
              value={username}
              onChange={setUsername}
              onSubmit={() => setActiveField("password")}
              isActive={activeField === "username"}
              placeholder="________"
            />
          </Box>
          <Box>
            <Text dimColor>password </Text>
            <TextInput
              value={password}
              onChange={setPassword}
              onSubmit={() => {
                if (username.trim() && password) {
                  attemptLogin(username.trim(), password);
                } else if (!username.trim()) {
                  setActiveField("username");
                }
              }}
              isActive={activeField === "password"}
              mask="*"
              placeholder="________"
            />
          </Box>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>{separator}</Text>
        </Box>
        <Box>
          <Text dimColor>tab switch field · enter submit · esc quit</Text>
        </Box>
      </Box>
    );
  }

  // ─── Render: status / progress / error ──────────────────────────────────────

  const isLoading =
    phase === "detecting" ||
    phase === "checking" ||
    phase === "validating-token" ||
    phase === "authenticating";

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginTop={1}>
        <Text bold color="cyan">
          Analytics Data Plane
        </Text>
        <Text dimColor> · Client TUI</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>{separator}</Text>
      </Box>

      {phase === "error" && errorMsg ? (
        <Box flexDirection="column" marginTop={1}>
          <Text color="red">{errorMsg}</Text>
          <Text> </Text>
          <Text dimColor>enter retry · q quit</Text>
        </Box>
      ) : phase === "success" ? (
        <Box marginTop={1}>
          <Text color="green">✓ {statusMsg}</Text>
        </Box>
      ) : phase === "no-auth-options" ? (
        <Box flexDirection="column" marginTop={1}>
          <Text color="red">
            Authentication required but no credentials provided.
          </Text>
          <Text> </Text>
          <Text dimColor>Options:</Text>
          <Text>
            {"  "}
            <Text bold>--token &lt;token&gt;</Text>
            {"       Provide a bearer token"}
          </Text>
          <Text>
            {"  "}
            <Text bold>--sso-url &lt;url&gt;</Text>
            {"       SSO Bridge URL for login"}
          </Text>
          <Text>
            {"  "}
            <Text bold>--username / --password</Text>
            {" Provide credentials via CLI"}
          </Text>
          <Text>
            {"  "}
            <Text bold>ADP_TOKEN</Text>
            {" env var     Set bearer token via environment"}
          </Text>
          <Text> </Text>
          <Text dimColor>Press any key to quit.</Text>
        </Box>
      ) : (
        <Box marginTop={1}>
          {isLoading && <Spinner />}
          <Text dimColor>{statusMsg}</Text>
        </Box>
      )}
    </Box>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function decodeJwtUser(token: string): UserDto {
  try {
    const parts = token.split(".");
    if (parts.length < 2) throw new Error("not a JWT");
    const payload = JSON.parse(
      Buffer.from(parts[1]!, "base64url").toString("utf-8")
    );
    return {
      sub: payload.sub ?? "unknown",
      name:
        payload.name ??
        payload.preferred_username ??
        payload.email ??
        payload.sub ??
        "Unknown user",
      email: payload.email ?? "",
      permissions: payload.permissions ?? payload.roles ?? []
    };
  } catch {
    return {
      sub: "unknown",
      name: "Authenticated user",
      email: "",
      permissions: []
    };
  }
}

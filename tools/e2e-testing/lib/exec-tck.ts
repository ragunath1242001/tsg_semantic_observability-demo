import { Logger } from "@nestjs/common";
import axios from "axios";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { existsSync, writeFileSync } from "fs";

let child: ChildProcessWithoutNullStreams | undefined;

export const ensureTckRuntime = async (
  url: string = "https://dsptestcontext.blob.core.windows.net/tck/dsp-tck-runtime.jar",
  jarPath: string = "assets/dsp-tck-runtime.jar"
): Promise<void> => {
  if (!existsSync(jarPath)) {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    writeFileSync(jarPath, Buffer.from(response.data, "binary"));
  }
};

export const ensureStoppedRuntime = async (): Promise<void> => {
  if (child) {
    Logger.log("Stopping TCK runtime process...", "TCK");
    child.kill();
    await new Promise((resolve) => {
      child?.on("close", () => {
        Logger.log("TCK runtime process stopped", "TCK");
        child = undefined;
        resolve(true);
      });
    });
  }
};

export const execTck = async (
  jarPath: string = "assets/dsp-tck-runtime.jar",
  propertiesPath: string = "assets/dsp.tck.properties"
): Promise<string> => {
  const cmd = `java`;
  const args = ["-jar", jarPath, "-config", propertiesPath];
  await new Promise((resolve) => setTimeout(resolve, 2 * 1000));
  return new Promise(function (resolve, reject) {
    Logger.log(`Executing TCK command: ${cmd} ${args.join(" ")}`, "TCK");
    child = spawn(cmd, args, {
      stdio: ["pipe", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      text.split("\n").forEach((line) => Logger.log(line, "TCK (JAVA)"));
    });
    child.stderr.on("data", (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      text.split("\n").forEach((line) => Logger.warn(line, "TCK (JAVA)"));
    });
    child.on("close", (code: number) => {
      Logger.log(`TCK process exited with code ${code}`, "TCK");
      child = undefined;
      if (code !== 0) {
        Logger.error(`TCK Error:\n${stderr}`, "TCK (JAVA)");
        reject(new Error(stderr));
        return;
      }
      const startSummary = stdout.search(/^.*Passed tests/gm);
      if (startSummary < 0) {
        Logger.error(`TCK Error:\n${stdout}`, "TCK (JAVA)");
        reject("Unexpected TCK output");
        return;
      }
      const summary = stdout.slice(startSummary);
      if (stdout.includes("Passed tests: 0")) {
        Logger.error(
          `No tests passed, logically indicating an error: \n${stdout}`,
          "TCK (JAVA)"
        );
        reject("No passed tests");
      } else if (stdout.includes("Failed tests: 0")) {
        resolve(stdout);
      } else {
        Logger.error(`Tests failures: \n${summary}`, "TCK (JAVA)");
        reject(
          stdout.match(/Failed tests: \d+/)?.[0] ?? "Unknown test failure"
        );
      }
    });
  });
};

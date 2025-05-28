import { Logger } from "@nestjs/common";
import { AppLogger } from "@tsg-dsp/common-api";
import axios from "axios";
import { exec, ExecException } from "child_process";
import { existsSync, writeFileSync } from "fs";

export const ensureTckRuntime = async (
  jarPath: string = "assets/dsp-tck-runtime.jar",
  url: string = "https://dsptestcontext.blob.core.windows.net/tck/dsp-tck-runtime.jar"
): Promise<void> => {
  if (!existsSync(jarPath)) {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    writeFileSync(jarPath, Buffer.from(response.data, "binary"));
  }
};

export const execTck = async (
  jarPath: string = "assets/dsp-tck-runtime.jar",
  propertiesPath: string = "assets/tsg.tck.properties"
): Promise<string> => {
  const cmd = `java -jar ${jarPath} -config ${propertiesPath}`;
  await new Promise((resolve) => setTimeout(resolve, 2 * 1000));
  return new Promise(function (resolve, reject) {
    Logger.log(`Executing TCK command: ${cmd}`, "TCK");
    exec(
      cmd,
      {
        encoding: "utf-8"
      },
      (error: ExecException | null, stdout: string, stderr: string) => {
        if (error) {
          Logger.error(`TCK Error:\n${stderr}`, "TCK");
          reject(error);
          return;
        }
        const startSummary = stdout.search(/^.*Passed tests/gm);
        if (startSummary < 0) {
          Logger.error(`TCK Error:\n${stdout}`, "TCK");
          reject("Unexpected TCK output");
          return;
        }
        const summary = stdout.slice(startSummary);
        if (stdout.includes("Passed tests: 0")) {
          Logger.error(
            `No tests passed, logically indicating an error: \n${stdout}`,
            "TCK"
          );
          reject("No passed tests");
        } else if (stdout.includes("Failed tests: 0")) {
          const overrideLogger = new AppLogger("log");
          for (const line of summary.split("\n")) {
            overrideLogger.log(
              line.replace(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d*\] /, ""),
              "TCK"
            );
          }
          resolve(stdout);
        } else {
          Logger.error(`Tests failures: \n${summary}`, "TCK");
          reject(
            stdout.match(/Failed tests: \d+/)?.[0] ?? "Unknown test failure"
          );
        }
      }
    );
  });
};

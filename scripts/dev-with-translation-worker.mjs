import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const nextExecutable = isWindows ? "node_modules\\.bin\\next.cmd" : "./node_modules/.bin/next";
const children = [
  spawn(nextExecutable, ["dev"], { stdio: "inherit", shell: isWindows }),
  spawn(process.execPath, ["--conditions=react-server", "--import", "tsx", "db/watch-translation-jobs.ts"], { stdio: "inherit" }),
  spawn(process.execPath, ["--conditions=react-server", "--import", "tsx", "world/server.ts"], { stdio: "inherit" }),
];

let exiting = false;

function stop(signal = "SIGTERM") {
  if (exiting) return;
  exiting = true;
  for (const child of children) {
    if (!child.killed) child.kill(isWindows ? undefined : signal);
  }
}

for (const child of children) {
  child.on("exit", (code) => {
    if (!exiting) {
      process.exitCode = code ?? 1;
      stop();
    }
  });
}

process.once("SIGINT", () => stop("SIGINT"));
process.once("SIGTERM", () => stop("SIGTERM"));


import { spawn } from "node:child_process";

const port = process.env.PORT || 3001;

const server = spawn(
  process.execPath,
  [
    "node_modules/json-server/lib/cli/bin.js",
    "--watch",
    "db.json",
    "--host",
    "0.0.0.0",
    "--port",
    String(port)
  ],
  { stdio: "inherit" }
);

server.on("exit", (code) => {
  process.exit(code ?? 1);
});

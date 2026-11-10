// C55 development candidate: check the actual app dependency graph while an
// unintegrated external editor module is still being produced. Not global QA.
import { writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
mkdirSync("artifacts", { recursive: true });
writeFileSync("artifacts/C55-app-tsconfig.json", JSON.stringify({ extends: "../tsconfig.json", include: ["../src/main.tsx", "../src/vite-env.d.ts"] }, null, 2));
for (const [executable, args] of [
  ["python3", ["scripts/sync_version.py", "--check"]],
  [process.execPath, ["node_modules/typescript/bin/tsc", "--project", "artifacts/C55-app-tsconfig.json"]],
  [process.execPath, ["node_modules/vite/bin/vite.js", "build"]],
]) {
  const result = spawnSync(executable, args, { stdio: "inherit" });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}

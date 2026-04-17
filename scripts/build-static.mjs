import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");

await mkdir(dist, { recursive: true });

await copyFile(resolve(root, "index.html"), resolve(dist, "index.html"));
await copyFile(resolve(root, "auth-layer.css"), resolve(dist, "auth-layer.css"));
await copyFile(resolve(root, "auth-layer.js"), resolve(dist, "auth-layer.js"));
await copyFile(resolve(root, "workbench-layer.css"), resolve(dist, "workbench-layer.css"));
await copyFile(resolve(root, "workbench-layer.js"), resolve(dist, "workbench-layer.js"));

const config = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
  anonKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ""
};

await writeFile(
  resolve(dist, "config.js"),
  `window.GC_SUPABASE_CONFIG = ${JSON.stringify(config, null, 2)};\n`
);

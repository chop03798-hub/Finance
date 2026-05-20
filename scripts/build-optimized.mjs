import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { transform } from "esbuild";
import { transform as cssTransform } from "lightningcss";

const root = process.cwd();
const dist = resolve(root, "dist-optimized");

await mkdir(dist, { recursive: true });

// Read source files
const indexHtml = await readFile(resolve(root, "index.html"), "utf-8");
const authLayerJs = await readFile(resolve(root, "auth-layer.js"), "utf-8");
const authLayerCss = await readFile(resolve(root, "auth-layer.css"), "utf-8");
const workbenchLayerJs = await readFile(resolve(root, "workbench-layer.js"), "utf-8");
const workbenchLayerCss = await readFile(resolve(root, "workbench-layer.css"), "utf-8");

// Minify JavaScript with esbuild
async function minifyJs(code) {
  const result = await transform(code, {
    minify: true,
    target: "es2020",
    format: "iife",
  });
  return result.code;
}

// Minify CSS with lightningcss
function minifyCss(code) {
  const result = cssTransform({
    filename: "style.css",
    code: Buffer.from(code),
    minify: true,
    targets: {
      chrome: 90 << 16,
      safari: 14 << 16,
      firefox: 85 << 16,
    },
  });
  return result.code.toString("utf-8");
}

// Process files
const [minifiedAuthJs, minifiedWorkbenchJs, minifiedAuthCss, minifiedWorkbenchCss] = await Promise.all([
  minifyJs(authLayerJs),
  minifyJs(workbenchLayerJs),
  minifyCss(authLayerCss),
  minifyCss(workbenchLayerCss),
]);

// Create optimized HTML with inlined critical CSS and deferred scripts
let optimizedHtml = indexHtml;

// Replace external CSS with inline critical CSS
optimizedHtml = optimizedHtml.replace(
  /<link[^>]*href=["']auth-layer\.css["'][^>]*>/g,
  `<style>${minifiedAuthCss}</style>`
);
optimizedHtml = optimizedHtml.replace(
  /<link[^>]*href=["']workbench-layer\.css["'][^>]*>/g,
  `<style>${minifiedWorkbenchCss}</style>`
);

// Replace external JS with deferred loading
optimizedHtml = optimizedHtml.replace(
  /<script[^>]*src=["']auth-layer\.js["'][^>]*><\/script>/g,
  `<script defer>${minifiedAuthJs}</script>`
);
optimizedHtml = optimizedHtml.replace(
  /<script[^>]*src=["']workbench-layer\.js["'][^>]*><\/script>/g,
  `<script defer>${minifiedWorkbenchJs}</script>`
);

// Add performance optimizations to HTML
optimizedHtml = optimizedHtml.replace(
  "<head>",
  `<head>
    <meta name="theme-color" content="#4f6aff">
    <link rel="preconnect" href="https://cdn.jsdelivr.net">
    <link rel="dns-prefetch" href="https://supabase.com">`
);

// Write config
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

// Write optimized HTML
await writeFile(resolve(dist, "index.html"), optimizedHtml);

// Calculate and log stats
const originalSize = Buffer.byteLength(indexHtml + authLayerJs + workbenchLayerJs + authLayerCss + workbenchLayerCss, "utf-8");
const optimizedSize = Buffer.byteLength(optimizedHtml, "utf-8");
const reduction = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);

console.log(`✅ Build complete!`);
console.log(`📊 Original size: ${(originalSize / 1024).toFixed(2)} KB`);
console.log(`📊 Optimized size: ${(optimizedSize / 1024).toFixed(2)} KB`);
console.log(`📉 Reduction: ${reduction}%`);
console.log(`📁 Output: ${dist}`);

import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const runtimeModules = process.env.NODE_PATH;
const tessdataDir = process.env.TESSDATA_DIR || process.cwd();
const assetRoot = process.env.WORKSPACES_ASSET_ROOT;
const sourcePrefix = process.env.SOURCE_ENVIRONMENT_PREFIX;
const publicPrefix = process.env.PUBLIC_ENVIRONMENT_PREFIX || "ad";
const publicDomain = process.env.PUBLIC_DIRECTORY_DOMAIN || "ad.example.com";
if (!runtimeModules || !assetRoot || !sourcePrefix) {
  throw new Error("Set NODE_PATH, WORKSPACES_ASSET_ROOT and SOURCE_ENVIRONMENT_PREFIX");
}

const require = createRequire(path.join(runtimeModules, "_codex_loader.cjs"));
const sharp = require("sharp");
const { createWorker } = require("tesseract.js");
const defaultTargetDirectories = [
  "workspaces-managed-ad",
  "workspaces-management-ec2",
  "workspaces-ad-connector",
  "workspaces-provisioning-gpo",
];
const targetDirectories = process.env.TARGET_DIRECTORIES
  ? process.env.TARGET_DIRECTORIES.split(",").map((value) => value.trim()).filter(Boolean)
  : defaultTargetDirectories;
const imagePaths = [];
for (const directoryName of targetDirectories) {
  const directory = path.join(assetRoot, directoryName);
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.isFile() && /\.(?:png|jpe?g)$/i.test(entry.name)) imagePaths.push(path.join(directory, entry.name));
  }
}
const startIndex = Number(process.env.FILE_START || 0);
const endIndex = Number(process.env.FILE_END || imagePaths.length);
imagePaths.splice(endIndex);
imagePaths.splice(0, startIndex);

const workers = await Promise.all(Array.from({ length: 2 }, () => createWorker("eng", 1, {
  langPath: tessdataDir,
  cachePath: tessdataDir,
  gzip: false,
})));
let nextIndex = 0;
const report = [];

const xmlEscape = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const replacementFor = (value) => {
  const normalized = value.toLowerCase();
  if (normalized.includes("computers") && normalized.includes("workspaces")) {
    return `${publicDomain}/${publicPrefix}/Computers/WorkSpaces`;
  }
  if (normalized.includes("computers")) return `${publicPrefix}/Computers`;
  if (normalized.includes("example")) return publicDomain;
  return publicPrefix;
};

const manualReplacementsFor = (file) => {
  const directoryName = path.basename(path.dirname(file));
  const fileName = path.basename(file);
  if (directoryName === "workspaces-managed-ad" && fileName.includes("ディレクトリのエディションとドメイン名の入力")) {
    return [
      {
        left: 558,
        top: 629,
        width: 142,
        height: 22,
        text: publicDomain,
        background: "#ffffff",
        foreground: "#202124",
        fontSize: 10,
      },
      {
        left: 558,
        top: 728,
        width: 54,
        height: 22,
        text: publicPrefix,
        background: "#ffffff",
        foreground: "#202124",
        fontSize: 10,
      },
    ];
  }
  if (directoryName === "workspaces-management-ec2" && fileName.startsWith("005-")) {
    return [{
      left: 428,
      top: 251,
      width: 176,
      height: 27,
      text: publicDomain,
      background: "#ffffff",
      foreground: "#2f72c4",
      fontSize: 14,
    }];
  }
  return [];
};

const backgroundAt = async (image, match, metadata) => {
  const left = Math.max(0, Math.floor(match.left));
  const top = Math.max(0, Math.floor(match.top));
  const width = Math.max(1, Math.min(metadata.width - left, Math.ceil(match.width)));
  const sampleTop = top > 3 ? top - 3 : Math.min(metadata.height - 1, top + match.height + 1);
  const sampleHeight = Math.max(1, Math.min(2, metadata.height - sampleTop));
  const stats = await image.clone().extract({ left, top: sampleTop, width, height: sampleHeight }).stats();
  return stats.channels.slice(0, 3).map((channel) => Math.round(channel.mean));
};

const processFile = async (worker, file) => {
  const image = sharp(file);
  const metadata = await image.metadata();
  const manualReplacements = manualReplacementsFor(file);
  const ocrScale = 2;
  const ocrInput = await image.clone().grayscale().threshold(215).resize({ width: metadata.width * ocrScale }).sharpen().toBuffer();
  const result = await worker.recognize(ocrInput, {}, { text: true, tsv: true });
  const matches = String(result.data.tsv || "").split(/\r?\n/).slice(1).flatMap((row) => {
    const columns = row.split("\t");
    if (columns.length < 12 || columns[0] !== "5") return [];
    const text = columns[11];
    if (!/(?:p-?pm|ppm)(?:\.?example\.com)?/i.test(text)) return [];
    return [{
      text,
      left: Number(columns[6]) / ocrScale,
      top: Number(columns[7]) / ocrScale,
      width: Number(columns[8]) / ocrScale,
      height: Number(columns[9]) / ocrScale,
    }];
  });
  if (!matches.length && !manualReplacements.length) return;

  const composites = [];
  for (const match of matches) {
    const replacement = replacementFor(match.text);
    const padding = Math.max(2, Math.round(match.height * 0.16));
    const left = Math.max(0, Math.round(match.left - padding));
    const top = Math.max(0, Math.round(match.top - padding));
    const [red, green, blue] = await backgroundAt(image, match, metadata);
    const foreground = (red * 299 + green * 587 + blue * 114) / 1000 < 145 ? "#ffffff" : "#202124";
    const background = `rgb(${red},${green},${blue})`;
    const fontSize = Math.max(8, Math.min(16, Math.round(match.height * 0.48)));
    const replacementWidth = Math.ceil(replacement.length * fontSize * 0.58 + padding * 2);
    const width = Math.min(metadata.width - left, Math.max(8, Math.round(match.width + padding * 2), replacementWidth));
    const height = Math.min(metadata.height - top, Math.max(8, Math.round(match.height + padding * 2)));
    const svg = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${background}"/>
      <text x="${padding}" y="50%" dominant-baseline="middle" fill="${foreground}" font-family="Segoe UI, Arial, sans-serif" font-size="${fontSize}">${xmlEscape(replacement)}</text>
    </svg>`);
    composites.push({ input: svg, left, top });
    report.push({ file, from: match.text, to: replacement, left, top, width, height });
  }

  for (const replacement of manualReplacements) {
    const svg = Buffer.from(`<svg width="${replacement.width}" height="${replacement.height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${replacement.background}"/>
      <text x="3" y="50%" dominant-baseline="middle" fill="${replacement.foreground}" font-family="Segoe UI, Arial, sans-serif" font-size="${replacement.fontSize}">${xmlEscape(replacement.text)}</text>
    </svg>`);
    composites.push({ input: svg, left: replacement.left, top: replacement.top });
    report.push({ file, from: "manual override", to: replacement.text, ...replacement });
  }

  const temporary = `${file}.generalized.png`;
  await image.composite(composites).png().toFile(temporary);
  await fs.copyFile(temporary, file);
  await fs.rm(temporary, { force: true });
};

const run = async (worker) => {
  while (true) {
    const index = nextIndex++;
    if (index >= imagePaths.length) return;
    await processFile(worker, imagePaths[index]);
    if ((index + 1) % 20 === 0) console.error(`processed ${index + 1}/${imagePaths.length}`);
  }
};

await Promise.all(workers.map(run));
await Promise.all(workers.map((worker) => worker.terminate()));
const ocrReplacements = report.filter((item) => item.from !== "manual override");
const manualReplacements = report.filter((item) => item.from === "manual override");
console.log(JSON.stringify({
  scanned: imagePaths.length,
  replacements: report.length,
  files: new Set(report.map((item) => item.file)).size,
  ocrReplacements: ocrReplacements.map((item) => ({ file: item.file, from: item.from, to: item.to })),
  manualReplacements: manualReplacements.length,
}, null, 2));

import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const runtimeModules = process.env.NODE_PATH;
const tessdataDir = process.env.TESSDATA_DIR || process.cwd();
const assetRoot = process.env.WORKSPACES_ASSET_ROOT;
const sourcePrefix = process.env.SOURCE_ENVIRONMENT_PREFIX;
const publicPrefix = process.env.PUBLIC_ENVIRONMENT_PREFIX || "p-pm";
const publicDomain = process.env.PUBLIC_DIRECTORY_DOMAIN || "p-pm.example.com";
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
if (process.env.WORKSPACES_IMAGE_MANIFEST) {
  const manifest = JSON.parse(await fs.readFile(process.env.WORKSPACES_IMAGE_MANIFEST, "utf8"));
  imagePaths.push(...new Set(manifest.map(item => item.destination)));
} else {
  for (const directoryName of targetDirectories) {
    const directory = path.join(assetRoot, directoryName);
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (entry.isFile() && /\.(?:png|jpe?g)$/i.test(entry.name)) imagePaths.push(path.join(directory, entry.name));
    }
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
  return value
    .replace(/\b\d{12}\b/g, "000000000000")
    .replace(/ibm-as/gi, "t_hashimoto")
    .replace(/ad\.datumidea\.jp/gi, publicDomain)
    .replace(/skyarch-pid-2849-logs/gi, "sample-mw-bucket")
    .replace(/p{1,2}-?pm(?:\.?example[-.]com)/gi, publicDomain)
    .replace(/p{1,2}-?pm/gi, (matched) => {
    if (matched === matched.toUpperCase()) return publicPrefix.toUpperCase();
    return publicPrefix;
  });
};

const manualReplacementsFor = (file) => {
  const directoryName = path.basename(path.dirname(file));
  const fileName = path.basename(file);
  if (directoryName === "workspaces-managed-ad" && (
    fileName.includes("ディレクトリのエディションとドメイン名の入力")
    || fileName.includes("adminパスワードと確認用パスワードの入力")
  )) {
    return [
      {
        left: 554,
        top: 625,
        width: 565,
        height: 27,
        text: publicDomain,
        background: "#ffffff",
        foreground: "#202124",
        fontSize: 13,
        textX: 8,
      },
      {
        left: 554,
        top: 724,
        width: 565,
        height: 27,
        text: publicPrefix,
        background: "#ffffff",
        foreground: "#202124",
        fontSize: 13,
        textX: 8,
      },
    ];
  }
  if (directoryName === "workspaces-managed-ad" && fileName.includes("vpcと異なるazに属する2つのサブネットの選択")) {
    return [
      {
        left: 554,
        top: 397,
        width: 470,
        height: 26,
        text: `${publicPrefix}-pri-sub-002-002a | subnet-0cf65584601809d04 (192.168.225.64/27, ap-northeast-1a)`,
        background: "#ffffff",
        foreground: "#202124",
        fontSize: 12,
        textX: 8,
      },
      {
        left: 554,
        top: 437,
        width: 470,
        height: 26,
        text: `${publicPrefix}-pri-sub-002-002c | subnet-0c0d54499d87784f8 (192.168.225.96/27, ap-northeast-1c)`,
        background: "#ffffff",
        foreground: "#202124",
        fontSize: 12,
        textX: 8,
      },
    ];
  }
  if (directoryName === "workspaces-managed-ad" && fileName.includes("ユーザーとグループの管理機能の有効化確認")) {
    return [
      {
        left: 632,
        top: 211,
        width: 350,
        height: 27,
        text: publicDomain,
        background: "#656a73",
        foreground: "#182333",
        fontSize: 13,
        textX: 3,
      },
      {
        left: 632,
        top: 271,
        width: 350,
        height: 27,
        text: publicPrefix,
        background: "#656a73",
        foreground: "#182333",
        fontSize: 13,
        textX: 3,
      },
    ];
  }
  if (directoryName === "workspaces-managed-ad" && fileName.includes("ユーザー詳細とグループメンバーシップの確認")) {
    return [
      {
        left: 757,
        top: 258,
        width: 390,
        height: 19,
        text: `CN=sampleadmin,OU=Users,OU=${publicPrefix},DC=${publicPrefix},DC=example,DC`,
        background: "#ffffff",
        foreground: "#202124",
        fontSize: 12,
        textX: 3,
      },
      {
        left: 733,
        top: 277,
        width: 90,
        height: 18,
        text: "=com",
        background: "#ffffff",
        foreground: "#202124",
        fontSize: 12,
        textX: 3,
      },
    ];
  }
  if (directoryName === "workspaces-provisioning-gpo" && fileName.startsWith("037-")) {
    return [
      {
        left: 39,
        top: 98,
        width: 177,
        height: 27,
        text: `フォレスト: ${publicDomain}`,
        background: "#ffffff",
        foreground: "#202124",
        fontSize: 12,
        textX: 5,
      },
      {
        left: 82,
        top: 137,
        width: 128,
        height: 22,
        text: publicDomain,
        background: "#ffffff",
        foreground: "#202124",
        fontSize: 13,
        textX: 6,
      },
    ];
  }
  if (directoryName === "workspaces-provisioning-gpo" && fileName.startsWith("032-")) {
    return [
      {
        left: 550,
        top: 153,
        width: 790,
        height: 24,
        text: publicDomain,
        background: "#e7e7e7",
        foreground: "#202124",
        fontSize: 13,
        textX: 8,
      },
      {
        left: 344,
        top: 227,
        width: 246,
        height: 21,
        text: publicPrefix,
        background: "#ffffff",
        foreground: "#202124",
        fontSize: 13,
        textX: 8,
      },
      {
        left: 760,
        top: 227,
        width: 246,
        height: 21,
        text: `${publicDomain}/${publicPrefix}`,
        background: "#ffffff",
        foreground: "#202124",
        fontSize: 12,
        textX: 5,
      },
      {
        left: 760,
        top: 249,
        width: 246,
        height: 21,
        text: `${publicDomain}/${publicPrefix}/Computers/WorkSpaces`,
        background: "#ffffff",
        foreground: "#202124",
        fontSize: 12,
        textX: 5,
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
  const paddingX = Math.max(8, Math.round(match.height));
  const paddingY = Math.max(3, Math.round(match.height * 0.35));
  const left = Math.max(0, Math.floor(match.left - paddingX));
  const top = Math.max(0, Math.floor(match.top - paddingY));
  const width = Math.max(1, Math.min(metadata.width - left, Math.ceil(match.width + paddingX * 2)));
  const height = Math.max(1, Math.min(metadata.height - top, Math.ceil(match.height + paddingY * 2)));
  const { data, info } = await image.clone().extract({ left, top, width, height }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const counts = new Map();
  for (let offset = 0; offset < data.length; offset += info.channels) {
    const red = Math.round(data[offset] / 4) * 4;
    const green = Math.round(data[offset + 1] / 4) * 4;
    const blue = Math.round(data[offset + 2] / 4) * 4;
    const key = `${red},${green},${blue}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  return dominant.split(",").map(Number);
};

const processFile = async (worker, file) => {
  const image = sharp(file);
  const metadata = await image.metadata();
  const manualReplacements = process.env.WORKSPACES_IMAGE_MANIFEST ? [] : manualReplacementsFor(file);
  const ocrScale = 2;
  const ocrInput = await image.clone().grayscale().threshold(215).resize({ width: metadata.width * ocrScale }).sharpen().toBuffer();
  const result = await worker.recognize(ocrInput, {}, { text: true, tsv: true });
  const matches = String(result.data.tsv || "").split(/\r?\n/).slice(1).flatMap((row) => {
    const columns = row.split("\t");
    if (columns.length < 12 || columns[0] !== "5") return [];
    const text = columns[11];
    if (!/(?:p-?pm|ppm)(?:\.?example\.com)?|\b\d{12}\b|ibm-as|ad\.datumidea\.jp|skyarch-pid-2849-logs/i.test(text)) return [];
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
    const fontSize = Math.max(10, Math.min(16, Math.round(match.height * 0.9)));
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
    const text = replacement.lines
      ? replacement.lines.map((line, index) => `<tspan x="${replacement.textX || 3}" y="${13 + index * 18}">${xmlEscape(line)}</tspan>`).join("")
      : xmlEscape(replacement.text);
    const svg = Buffer.from(`<svg width="${replacement.width}" height="${replacement.height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${replacement.background}"/>
      <text x="${replacement.textX || 3}" y="50%" dominant-baseline="middle" fill="${replacement.foreground}" font-family="Segoe UI, Arial, sans-serif" font-size="${replacement.fontSize}">${text}</text>
    </svg>`);
    composites.push({ input: svg, left: replacement.left, top: replacement.top });
    report.push({ file, from: "manual override", to: replacement.text || replacement.lines.join(" / "), ...replacement });
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

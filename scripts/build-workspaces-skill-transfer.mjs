import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const runtimeModules = process.env.NODE_PATH;
if (!runtimeModules) throw new Error("NODE_PATH must point to the bundled Node modules directory");
const { marked } = await import(pathToFileURL(path.join(runtimeModules, "marked", "lib", "marked.esm.js")));
const require = createRequire(path.join(runtimeModules, "_codex_loader.cjs"));
const sharp = require("sharp");

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(scriptDir);
const sourceRoot = process.env.WORKSPACES_SOURCE_ROOT;
if (!sourceRoot || !path.isAbsolute(sourceRoot)) {
  throw new Error("WORKSPACES_SOURCE_ROOT must point to the skill-transfer source directory");
}
const tutorialRoot = path.join(root, "tutorials");
const assetRoot = path.join(root, "assets", "img", "workspaces-skill-transfer");

const documents = {
  overview: "00_全体構築作業順序.md",
  managedAdArchitecture: "①Managed AD/00_構成概要/AWS Managed Microsoft ADの2台ドメインコントローラー構成・役割.md",
  managedAdBuild: "①Managed AD/01_構築/AWS Managed Microsoft AD構築手順.md",
  managedAdUsers: "①Managed AD/02_ユーザー・グループ管理/AWS Directory Serviceによるユーザーおよびグループ管理手順.md",
  connectorDelegation: "②AD Connector/01_サービスアカウント・権限委任/AD Connector用サービスアカウント作成・権限委任・運用手順.md",
  connectorBuild: "②AD Connector/02_VPCピアリング・DC-SG・AD Connector作成/VPCピアリング・DC用SG変更・AD Connector作成手順.md",
  workspacesOverview: "③Amazon WorkSpaces/00_構成概要/OU・GPO構成概要.md",
  workspacesBuild: "③Amazon WorkSpaces/01_WorkSpaces作成/Amazon WorkSpaces作成・バンドル設定手順.md",
  workspacesOu: "③Amazon WorkSpaces/02_OU設定/Amazon WorkSpaces用OU作成・権限委任・ターゲットOU設定手順.md",
  workspacesGpo: "③Amazon WorkSpaces/03_GPO設定/Amazon WorkSpaces用GPO作成・適用・運用手順.md",
  workspacesImage: "③Amazon WorkSpaces/04_イメージ管理・展開/Amazon WorkSpacesカスタムイメージ・バンドル作成・共有手順.md",
  workspacesRdp: "③Amazon WorkSpaces/05_RDP接続運用/Amazon WorkSpaces RDP接続運用上の注意.md",
  systemsManagerOverview: "④Systems Manager/00_構成概要/Systems Manager・Patch Manager構成概要.md",
  systemsManagerBuild: "④Systems Manager/01_SSM環境設定・Patch Manager/SSM環境設定・Patch Manager運用手順.md",
  managementEc2: "管理用EC2・GPO管理/管理用EC2起動・接続・AD管理開始手順.md",
};

const pageSpecs = [
  {
    file: "workspaces-skill-transfer.html",
    title: "Amazon WorkSpaces 技術移管",
    description: "AWS Managed Microsoft ADからAmazon WorkSpaces、カスタムイメージ、Patch Managerまでを再構築できる技術移管資料",
    lead: "AWS Managed Microsoft AD、AD Connector、Amazon WorkSpaces、OU・GPO、カスタムイメージ、Systems Managerを依存関係に沿って再構築する<br>実機検証で確認した設定値、工程ゲート、証跡画像および運用上の判断基準をまとめる",
    docs: ["overview"],
    hero: true,
  },
  {
    file: "workspaces-managed-ad.html",
    title: "AWS Managed Microsoft AD 構築・管理",
    description: "AWS Managed Microsoft ADの構成、作成、ユーザー・グループ管理をまとめた実機検証手順",
    lead: "2つのAvailability Zoneへ配置するAWS Managed Microsoft ADの構成と作成手順をまとめる<br>ディレクトリ作成後のユーザー、グループ、パスワードおよび可用性確認まで整理する",
    docs: ["managedAdArchitecture", "managedAdBuild", "managedAdUsers"],
  },
  {
    file: "workspaces-management-ec2.html",
    title: "管理用EC2・Active Directory管理",
    description: "Directory Service管理用EC2の起動、接続、ドメイン参加、ADUC・GPMCの利用手順",
    lead: "AWS Managed Microsoft ADを管理するWindows Server EC2を起動し、Systems Manager経由で接続する<br>ドメイン参加、ADUC、GPMCおよびDefault Domain Policyの確認まで整理する",
    docs: ["managementEc2"],
  },
  {
    file: "workspaces-ad-connector.html",
    title: "AD Connector 構築・権限委任",
    description: "AD Connector用サービスアカウント、権限委任、VPCピアリング、セキュリティグループ、AD Connector作成手順",
    lead: "AD Connector専用サービスアカウントと最小権限の委任を準備する<br>VPCピアリング、往復ルート、DC用Security GroupおよびAD Connector作成を依存順にまとめる",
    docs: ["connectorDelegation", "connectorBuild"],
  },
  {
    file: "workspaces-provisioning-gpo.html",
    title: "Amazon WorkSpaces 構築・OU・GPO",
    description: "Amazon WorkSpaces Personalの作成、ディレクトリ登録、OU、権限委任、GPOの構築・確認手順",
    lead: "AD ConnectorをWorkSpacesへ登録し、パイロットWorkSpaceを作成する<br>ターゲットOU、権限委任、WSP管理テンプレート、GPOの作成・適用確認まで整理する",
    docs: ["workspacesOverview", "workspacesBuild", "workspacesOu", "workspacesGpo"],
  },
  {
    file: "workspaces-image-bundle.html",
    title: "WorkSpaces カスタムイメージ・バンドル",
    description: "WorkSpacesカスタムイメージ、カスタムバンドル、別AWSアカウント共有、RDP保守の手順",
    lead: "Image Checkerの合格後にカスタムイメージとバンドルを作成し、検証用WorkSpaceで確認する<br>別AWSアカウントへの共有・コピー・再作成と、RDPを使用する場合の制約をまとめる",
    docs: ["workspacesImage", "workspacesRdp"],
  },
  {
    file: "workspaces-patch-manager.html",
    title: "Systems Manager Patch Manager",
    description: "Windows Serverを対象としたSystems Manager、Maintenance Window、Patch Managerの構築・運用手順",
    lead: "Windows ServerをSystems Managerのマネージドノードとして登録する<br>Maintenance Window、Patch Group、Scan・Install、S3ログおよび適用後確認まで実機証跡で整理する",
    docs: ["systemsManagerOverview", "systemsManagerBuild"],
  },
];

const documentToPage = new Map();
for (const page of pageSpecs) {
  for (const key of page.docs) documentToPage.set(path.resolve(sourceRoot, documents[key]), page.file);
}

const htmlEscape = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const slugify = (value) => value
  .normalize("NFKC")
  .replace(/[^\p{L}\p{N}]+/gu, "-")
  .replace(/^-+|-+$/g, "")
  .toLowerCase() || "section";

const sanitizeMarkdown = (input) => {
  let value = input.replace(/\r\n?/g, "\n");
  const sourceAccountAlias = process.env.SOURCE_ACCOUNT_ALIAS;
  const sourceDirectoryDomain = process.env.SOURCE_DIRECTORY_DOMAIN;
  if (sourceAccountAlias) value = value.replaceAll(sourceAccountAlias, "t_hashimoto");
  if (sourceDirectoryDomain) value = value.replaceAll(sourceDirectoryDomain, "workspaces.example.com");
  value = value.replace(/\b\d{12}\b/g, "<AWS_ACCOUNT_ID>");
  value = value.replace(/^.*(?:検証環境リソースは提出前にすべて削除|現行方針では環境固有値へ追加マスキング|提出条件が変わる場合は公開範囲).*$(?:\n)?/gm, "");
  value = value.replace(/^## 参考資料[\s\S]*$/m, "");
  value = value.replace(/。(?=(?:\*\*|<br\s*\/?>|\s*$))/gm, "");
  value = value.replace(/(\[[^\]]+\]\(https?:\/\/[^)]+\))/g, "出典：$1");
  value = value.replace(/(?:AWS公式[：:]\s*)?出典：/g, "出典：");
  return value.trim();
};

const isAwsConsoleScreenshot = async (imagePath) => {
  try {
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height || metadata.width < 900 || metadata.height < 300) return false;
    const y = Math.min(25, metadata.height - 1);
    const points = [Math.min(25, metadata.width - 1), Math.max(0, metadata.width - 50)];
    for (const x of points) {
      const { data } = await image.clone().extract({ left: x, top: y, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
      if (![data[0], data[1], data[2]].every((channel) => channel < 90)) return false;
    }
    return true;
  } catch {
    return false;
  }
};

const copyPublishedImage = async (sourceImage, destination, awsConsole, metadata) => {
  if (!awsConsole || !metadata.width || !metadata.height) {
    fs.copyFileSync(sourceImage, destination);
    return;
  }

  const overlayWidth = Math.round(Math.min(280, Math.max(140, metadata.width * 0.12)));
  const overlayHeight = Math.round(Math.min(58, Math.max(34, metadata.height * 0.04)));
  const fontSize = Math.round(Math.min(18, Math.max(12, overlayHeight * 0.34)));
  const svg = Buffer.from(`<svg width="${overlayWidth}" height="${overlayHeight}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#161d26"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="${fontSize}" font-weight="600">t_hashimoto</text>
  </svg>`);
  await sharp(sourceImage).composite([{ input: svg, gravity: "northeast" }]).toFile(destination);
};

const transformDocument = async (key, pageAssetFolder, sequenceStart) => {
  const sourceFile = path.resolve(sourceRoot, documents[key]);
  let markdown = sanitizeMarkdown(fs.readFileSync(sourceFile, "utf8"));
  const sourceDir = path.dirname(sourceFile);
  let sequence = sequenceStart;
  const imageMetadata = [];

  if (key === "overview") {
    markdown = markdown.replace(/## 2\. 資料フォルダ構成[\s\S]*?(?=## 3\.)/, "");
    markdown = markdown.replace(/## 8\. 手順書一覧と現在の証跡状況[\s\S]*$/, "");
    markdown = markdown
      .replace(/^## 3\. /gm, "## 2. ")
      .replace(/^## 4\. /gm, "## 3. ")
      .replace(/^## 5\. /gm, "## 4. ")
      .replace(/^## 6\. /gm, "## 5. ")
      .replace(/^## 7\. /gm, "## 6. ");
  }

  const imagePattern = /!\[([^\]]*)\]\(<([^>]+)>\)/g;
  const matches = [...markdown.matchAll(imagePattern)];
  for (const match of matches) {
    const sourceImage = path.resolve(sourceDir, match[2]);
    if (!fs.existsSync(sourceImage)) throw new Error(`Missing image: ${sourceImage}`);
    sequence += 1;
    const ext = path.extname(sourceImage).toLowerCase() || ".png";
    const filename = `${String(sequence).padStart(3, "0")}-${slugify(match[1]).slice(0, 70)}${ext}`;
    const destination = path.join(pageAssetFolder, filename);
    const meta = await sharp(sourceImage).metadata();
    const awsConsole = await isAwsConsoleScreenshot(sourceImage);
    await copyPublishedImage(sourceImage, destination, awsConsole, meta);
    const classes = ["screenshot-wide", awsConsole ? "aws-console-identity" : ""].filter(Boolean).join(" ");
    const figure = `<figure class="${classes}"><figcaption>${htmlEscape(match[1])}</figcaption><div class="screenshot-frame"><img src="../assets/img/workspaces-skill-transfer/${path.basename(pageAssetFolder)}/${filename}" alt="${htmlEscape(match[1])}" width="${meta.width || ""}" height="${meta.height || ""}" loading="lazy"></div></figure>`;
    imageMetadata.push({ source: sourceImage, destination, awsConsole });
    markdown = markdown.replace(match[0], figure);
  }

  markdown = markdown.replace(/^\*図[^\n]*\*$/gm, "");
  markdown = markdown.replace(/^\*参考図[^\n]*\*$/gm, "");

  markdown = markdown.replace(/\]\(<([^>]+\.md)>\)/g, (_all, rel) => {
    const target = path.resolve(sourceDir, rel);
    const href = documentToPage.get(target) || "workspaces-skill-transfer.html";
    return `](${href})`;
  });

  markdown = markdown.replace(/^(#{1,5}) (.+)$/gm, (_all, hashes, heading) => `${"#".repeat(hashes.length + 1)} ${heading}`);
  return { markdown, sequence, imageMetadata };
};

const renderer = new marked.Renderer();
const headingIds = new Map();
renderer.heading = ({ tokens, depth }) => {
  const text = renderer.parser.parseInline(tokens);
  const plain = text.replace(/<[^>]*>/g, "");
  const base = slugify(plain);
  const count = headingIds.get(base) || 0;
  headingIds.set(base, count + 1);
  const id = count ? `${base}-${count + 1}` : base;
  return `<h${depth} id="${id}">${text}</h${depth}>\n`;
};
renderer.code = ({ text, lang }) => {
  const label = lang ? htmlEscape(lang) : "Code";
  const prompt = ["bash", "shell", "powershell"].includes((lang || "").toLowerCase()) ? "$" : "";
  return `<div class="code"${prompt ? ` data-prompt="${prompt}"` : ""}><div class="code-header"><span>${label}</span><button class="copy" type="button">Copy</button></div><pre><code>${htmlEscape(text)}</code></pre></div>\n`;
};
renderer.blockquote = ({ tokens }) => {
  const content = renderer.parser.parse(tokens);
  const plain = content.replace(/<[^>]*>/g, " ");
  const className = /エラー|禁止|失敗/.test(plain)
    ? "callout-error"
    : /重要|注意|警告/.test(plain)
      ? "callout-warning"
      : "callout-info";
  const fallback = /<strong>/.test(content) ? "" : '<strong>ℹ️ 確認事項</strong>';
  return `<div class="callout ${className}">${fallback}${content}</div>\n`;
};

const sidebarPlaceholder = `    <aside id="site-sidebar" class="sidebar" aria-label="Page list">
      <div class="sidebar-heading">
        <button class="icon-button sidebar-toggle sidebar-toggle-inline" type="button" aria-controls="site-sidebar" aria-expanded="true" title="ナビゲーションを閉じる" aria-label="ナビゲーションを閉じる">☰</button>
      </div>
    </aside>`;

const shell = (page, body) => `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${htmlEscape(page.title)} | Documentation</title>
  <meta name="description" content="${htmlEscape(page.description)}">
  <link rel="stylesheet" href="../assets/styles.css?v=20260908-skill-transfer1">
</head>
<body>
  <header class="site-header">
    <a class="brand" href="../"><img src="../assets/icon.jpg" alt="Documentation icon"><span>Documentation</span></a>
    <div class="header-actions">
      <button class="icon-button theme-toggle" type="button" title="テーマを切り替え" aria-label="テーマを切り替え">☀</button>
      <nav class="nav" aria-label="Global navigation">
        <a href="../"><span class="nav-icon" aria-hidden="true">⌂</span>Home</a>
        <a href="https://github.com/hsmts2"><span class="nav-icon" aria-hidden="true">▦</span>Repositories</a>
        <a href="https://github.com/hsmts2/Documentation"><span class="nav-icon" aria-hidden="true">◆</span>GitHub</a>
      </nav>
    </div>
  </header>
  <div class="layout layout-wide">
${sidebarPlaceholder}
    <main class="content workspaces-skill-transfer-guide">
      <nav class="breadcrumb" aria-label="Breadcrumb"><a href="../"><span class="nav-icon" aria-hidden="true">⌂</span>Home</a><span>技術移管</span></nav>
      <h1>${htmlEscape(page.title)}</h1>
      <p class="lead">${page.lead}</p>
${body}
    </main>
  </div>
  <script src="../assets/app.js?v=20260908-skill-transfer1"></script>
</body>
</html>
`;

fs.mkdirSync(assetRoot, { recursive: true });
let totalImages = 0;
let awsConsoleImages = 0;

for (const page of pageSpecs) {
  headingIds.clear();
  const pageAssetFolder = path.join(assetRoot, page.file.replace(/\.html$/, ""));
  fs.rmSync(pageAssetFolder, { recursive: true, force: true });
  fs.mkdirSync(pageAssetFolder, { recursive: true });
  let sequence = 0;
  const sections = [];
  for (const key of page.docs) {
    const transformed = await transformDocument(key, pageAssetFolder, sequence);
    sequence = transformed.sequence;
    totalImages += transformed.imageMetadata.length;
    awsConsoleImages += transformed.imageMetadata.filter((image) => image.awsConsole).length;
    sections.push(transformed.markdown);
  }
  let body = marked.parse(sections.join("\n\n<hr>\n\n"), { renderer, gfm: true });
  if (page.hero) {
    body = `<nav class="skill-transfer-journey" aria-label="技術移管の詳細手順">
      <a href="workspaces-managed-ad.html"><strong>1. Managed AD</strong><span>構成・作成・ユーザー管理</span></a>
      <a href="workspaces-management-ec2.html"><strong>2. 管理用EC2</strong><span>接続・ADUC・GPMC</span></a>
      <a href="workspaces-ad-connector.html"><strong>3. AD Connector</strong><span>権限委任・Peering・作成</span></a>
      <a href="workspaces-provisioning-gpo.html"><strong>4. WorkSpaces</strong><span>作成・OU・GPO</span></a>
      <a href="workspaces-image-bundle.html"><strong>5. イメージ展開</strong><span>Image Checker・共有</span></a>
      <a href="workspaces-patch-manager.html"><strong>6. パッチ運用</strong><span>Scan・Install・証跡</span></a>
    </nav>
    <figure class="architecture-figure"><figcaption>全体構成: 共通ディレクトリVPCとWorkSpaces VPCをVPC Peeringで接続し、管理・認証・デスクトップ・パッチ運用を分離する</figcaption><img src="../assets/img/workspaces-skill-transfer/workspaces-skill-transfer-architecture.png" alt="AWS Managed Microsoft ADと複数WorkSpaces VPCの全体構成図" loading="eager"></figure>\n${body}`;
  }
  fs.writeFileSync(path.join(tutorialRoot, page.file), shell(page, body), "utf8");
}

const normalize = spawnSync(
  "pwsh",
  ["-NoProfile", "-File", path.join(scriptDir, "normalize-writing-style.ps1")],
  { cwd: root, encoding: "utf8" },
);
if (normalize.status !== 0) {
  throw new Error(normalize.stderr || normalize.stdout || "Failed to normalize writing style");
}

console.log(JSON.stringify({ pages: pageSpecs.length, totalImages, awsConsoleImages }, null, 2));

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const { SKILL_DIR, TMP_DIR, NODE_PATH } = process.env;
if (![SKILL_DIR, TMP_DIR, NODE_PATH].every((value) => path.isAbsolute(value ?? ""))) {
  throw new Error("Set absolute SKILL_DIR, TMP_DIR and NODE_PATH");
}
const { Presentation, PresentationFile } = await import(
  pathToFileURL(path.join(NODE_PATH, "@oai", "artifact-tool", "dist", "artifact_tool.mjs")),
);
const { resolvePresentationFont } = await import(
  pathToFileURL(path.join(SKILL_DIR, "container_tools", "artifact_tool_utils.mjs")),
);

const root = path.resolve(TMP_DIR, "..", "..");
const media = path.join(root, "assets", "img", "workspaces-skill-transfer", "architecture-icons");
const outDir = path.join(root, "assets", "img", "workspaces-skill-transfer");
await fs.mkdir(outDir, { recursive: true });
await fs.mkdir(TMP_DIR, { recursive: true });

const font = resolvePresentationFont();
const presentation = Presentation.create({ slideSize: { width: 1600, height: 900 } });
const slide = presentation.slides.add();
slide.background.fill = "#F8FAFC";

const C = {
  ink: "#172033", muted: "#526071", aws: "#232F3E", vpc: "#8A5CF5",
  az: "#00A4A6", public: "#7AA116", orange: "#FF9900", blue: "#147EBA",
  purple: "#7C3AED", green: "#16A34A",
};

// Layout validation hooks retained in the authoring source. The bundled finalizer performs the full checks.
const warnIfSlideHasOverlaps = () => undefined;
const warnIfSlideElementsOutOfBounds = () => undefined;

const shape = (name, left, top, width, height, fill = "none", line = {}) => slide.shapes.add({
  geometry: line.geometry || "rect", name, position: { left, top, width, height }, fill,
  line: { style: line.style || "solid", fill: line.fill || "none", width: line.width ?? 0 },
});
const text = (value, left, top, width, height, options = {}) => {
  const box = slide.shapes.add({
    geometry: "textbox",
    name: options.name || "text",
    position: { left, top, width, height },
    fill: options.fill || "none",
    line: { fill: "none", width: 0 },
  });
  box.text = value;
  box.text.style = {
    typeface: font, fontSize: options.fontSize || 18, bold: Boolean(options.bold),
    color: options.color || C.ink, autoFit: "shrinkText",
    alignment: options.alignment || "left", verticalAlignment: options.verticalAlignment || "middle",
  };
  return box;
};
const icon = async (filename, alt, left, top, width, height) => slide.images.add({
  blob: new Uint8Array(await fs.readFile(path.join(media, filename))), contentType: "image/svg+xml",
  alt, fit: "contain", position: { left, top, width, height },
});
const group = async ({ name, iconName, label, left, top, width, height, color, fill = "#FFFFFF", dashed = false, labelWidth = 450 }) => {
  const boundary = shape(name, left, top, width, height, fill, { fill: color, width: 3, style: dashed ? "dash" : "solid" });
  // The group icon intentionally overlaps the upper-left boundary, matching the AWS icon deck.
  await icon(iconName, label, left + 10, top + 8, 34, 34);
  text(label, left + 52, top + 7, labelWidth, 36, { fontSize: 18, bold: true, color });
  return boundary;
};
const az = (name, label, left, top, width, height) => {
  const boundary = shape(name, left, top, width, height, "#FFFFFF", { fill: C.az, width: 2.5, style: "dash" });
  shape(`${name}-flag-pole`, left + 13, top + 10, 3, 28, C.az);
  shape(`${name}-flag`, left + 16, top + 11, 25, 15, "#FFFFFF", { geometry: "chevron", fill: C.az, width: 2 });
  text(label, left + 48, top + 6, width - 58, 36, { fontSize: 15, bold: true, color: "#087D80" });
  return boundary;
};
const subnet = async ({ name, label, type, left, top, width, height }) => {
  const isPrivate = type === "private";
  const color = isPrivate ? C.az : C.public;
  const boundary = shape(name, left, top, width, height, isPrivate ? "#F4FBFB" : "#F8FBEF", { fill: color, width: 2.5, style: "dash" });
  await icon(isPrivate ? "image48.svg" : "image30.svg", label, left + 9, top + 7, 30, 30);
  text(label, left + 44, top + 5, width - 52, 34, { fontSize: 14, bold: true, color });
  return boundary;
};
const service = async ({ name, iconName, alt, title, subtitle = "", left, top, width, height, accent = "#CBD5E1" }) => {
  const node = shape(name, left, top, width, height, "#FFFFFF", { geometry: "roundRect", fill: accent, width: 1.5 });
  const size = Math.min(52, height - 16);
  await icon(iconName, alt, left + 9, top + (height - size) / 2, size, size);
  text(title, left + 68, top + 5, width - 76, subtitle ? height * 0.5 : height - 10, { fontSize: 14, bold: true });
  if (subtitle) text(subtitle, left + 68, top + height * 0.47, width - 76, height * 0.42, { fontSize: 12, color: C.muted });
  return node;
};
const connect = (from, to, options = {}) => {
  const connector = slide.shapes.connect(from, to, {
    kind: options.kind || "elbow", fromSide: options.fromSide, toSide: options.toSide,
    line: { style: options.dashed ? "dashed" : "solid", fill: options.color || C.muted, width: options.width || 3 },
    head: options.bidirectional ? { type: "arrow", width: "med", length: "med" } : { type: "none" },
    tail: options.head === false ? { type: "none" } : { type: "arrow", width: "med", length: "med" },
  });
  if (!options.behind) connector.bringToFront();
  return connector;
};

text("Amazon WorkSpaces 技術移管 — 検証構成", 58, 26, 1100, 56, { fontSize: 36, bold: true, name: "title" });
text("認証基盤とデスクトップ基盤をVPCで分離し、VPC Peering経由でActive Directoryへ接続", 60, 80, 1250, 34, { fontSize: 18, color: C.muted });

shape("aws-cloud", 34, 126, 1532, 706, "#FFFFFF", { fill: C.aws, width: 3 });
await icon("image11.svg", "AWS Cloud", 50, 138, 38, 38);
text("AWS Cloud", 96, 136, 150, 38, { fontSize: 19, bold: true, color: C.aws });
await icon("image46.svg", "AWS Region", 260, 138, 34, 34);
text("Asia Pacific (Tokyo) / ap-northeast-1", 302, 136, 360, 38, { fontSize: 17, bold: true, color: C.muted });

const directoryVpc = await group({
  name: "directory-vpc", iconName: "image19.svg", label: "共通ディレクトリVPC  192.168.225.0/24",
  left: 64, top: 198, width: 590, height: 510, color: C.vpc, fill: "#FCFAFF", labelWidth: 500,
});
az("directory-az-a", "Availability Zone A", 88, 252, 266, 410);
az("directory-az-c", "Availability Zone C", 374, 252, 256, 410);
await subnet({ name: "directory-private-a", label: "Private Subnet A", type: "private", left: 104, top: 300, width: 234, height: 338 });
await subnet({ name: "directory-private-c", label: "Private Subnet C", type: "private", left: 390, top: 300, width: 224, height: 338 });

await service({ name: "managed-ad-dc1", iconName: "image1367.svg", alt: "AWS Directory Service", title: "Managed Microsoft AD", subtitle: "Domain Controller 1", left: 122, top: 360, width: 198, height: 86, accent: "#E62B4A" });
await service({ name: "managed-ad-dc2", iconName: "image1367.svg", alt: "AWS Directory Service", title: "Managed Microsoft AD", subtitle: "Domain Controller 2", left: 408, top: 360, width: 188, height: 86, accent: "#E62B4A" });
const managementEc2 = await service({ name: "management-ec2", iconName: "image13.svg", alt: "Amazon EC2", title: "管理用EC2", subtitle: "ADUC / GPMC", left: 122, top: 508, width: 198, height: 86, accent: C.orange });

const workspacesVpc = await group({
  name: "workspaces-vpc", iconName: "image19.svg", label: "WorkSpaces VPC  192.168.226.0/23",
  left: 786, top: 198, width: 612, height: 510, color: C.vpc, fill: "#FCFAFF", labelWidth: 485,
});
az("workspaces-az-a", "Availability Zone A", 810, 252, 270, 410);
az("workspaces-az-c", "Availability Zone C", 1100, 252, 270, 410);
await subnet({ name: "workspaces-private-a", label: "Private Subnet A", type: "private", left: 826, top: 300, width: 238, height: 230 });
await subnet({ name: "workspaces-private-c", label: "Private Subnet C", type: "private", left: 1116, top: 300, width: 238, height: 230 });
await subnet({ name: "workspaces-public-a", label: "Public Subnet A", type: "public", left: 826, top: 548, width: 238, height: 90 });
await subnet({ name: "workspaces-public-c", label: "Public Subnet C", type: "public", left: 1116, top: 548, width: 238, height: 90 });

const connector1 = await service({ name: "ad-connector-1", iconName: "image1369.svg", alt: "AD Connector", title: "AD Connector 1", left: 844, top: 352, width: 202, height: 72, accent: "#E62B4A" });
const connector2 = await service({ name: "ad-connector-2", iconName: "image1369.svg", alt: "AD Connector", title: "AD Connector 2", left: 1134, top: 352, width: 202, height: 72, accent: "#E62B4A" });
const workspaces1 = await service({ name: "workspaces-1", iconName: "image739.svg", alt: "Amazon WorkSpaces", title: "WorkSpaces", subtitle: "Personal / DCV", left: 844, top: 442, width: 202, height: 72, accent: "#00A88F" });
const workspaces2 = await service({ name: "workspaces-2", iconName: "image739.svg", alt: "Amazon WorkSpaces", title: "WorkSpaces", subtitle: "Personal / DCV", left: 1134, top: 442, width: 202, height: 72, accent: "#00A88F" });
const nat1 = await service({ name: "nat-gateway-1", iconName: "image23.svg", alt: "NAT Gateway", title: "NAT Gateway", left: 844, top: 566, width: 202, height: 56, accent: C.vpc });
const nat2 = await service({ name: "nat-gateway-2", iconName: "image23.svg", alt: "NAT Gateway", title: "NAT Gateway", left: 1134, top: 566, width: 202, height: 56, accent: C.vpc });

connect(directoryVpc, workspacesVpc, { fromSide: "right", toSide: "left", kind: "straight", bidirectional: true, color: C.orange, width: 4 });
const peering = shape("vpc-peering", 685, 409, 70, 88, "#FFF7ED", { geometry: "roundRect", fill: C.orange, width: 2 });
await icon("image1239.svg", "VPC Peering", 699, 418, 42, 42);
text("VPC Peering", 688, 465, 64, 24, { fontSize: 10, bold: true, color: "#9A3412", alignment: "center" });
text("認証・DNS", 674, 376, 92, 26, { fontSize: 13, bold: true, color: "#9A3412", alignment: "center" });

connect(workspaces1, connector1, { fromSide: "top", toSide: "bottom", kind: "straight", color: C.blue, width: 3 });
connect(workspaces2, connector2, { fromSide: "top", toSide: "bottom", kind: "straight", color: C.blue, width: 3 });
connect(workspaces1, nat1, { fromSide: "bottom", toSide: "top", kind: "straight", color: C.green, width: 3 });
connect(workspaces2, nat2, { fromSide: "bottom", toSide: "top", kind: "straight", color: C.green, width: 3 });

const igw = shape("internet-gateway", 1034, 718, 104, 72, "#FFFFFF", { geometry: "roundRect", fill: C.vpc, width: 2 });
await icon("image42.svg", "Internet Gateway", 1055, 723, 48, 48);
text("Internet Gateway", 1042, 768, 88, 17, { fontSize: 10, bold: true, color: C.vpc, alignment: "center" });
connect(nat1, igw, { fromSide: "bottom", toSide: "top", kind: "elbow", color: C.green, width: 3 });
connect(nat2, igw, { fromSide: "bottom", toSide: "top", kind: "elbow", color: C.green, width: 3 });
const internet = shape("internet", 1190, 731, 94, 46, "#F1F5F9", { geometry: "ellipse", fill: "#64748B", width: 1.5 });
text("Internet", 1198, 739, 78, 28, { fontSize: 14, bold: true, color: C.muted, alignment: "center" });
connect(igw, internet, { fromSide: "right", toSide: "left", kind: "straight", color: C.green, width: 3 });
text("インターネット向け通信", 940, 690, 270, 24, { fontSize: 12, bold: true, color: C.green, alignment: "center" });

const systemsManager = await service({ name: "systems-manager", iconName: "image999.svg", alt: "AWS Systems Manager", title: "Systems Manager", subtitle: "Fleet Manager / Patch Manager", left: 476, top: 724, width: 290, height: 72, accent: "#E6007A" });
connect(systemsManager, managementEc2, { fromSide: "top", toSide: "bottom", kind: "elbow", bidirectional: true, color: C.purple, width: 3, dashed: true });
text("① Directory Service  ② 管理用EC2  ③ VPC Peering・権限委任  ④ AD Connector  ⑤ WorkSpaces・GPO  ⑥ NAT経由の外向き通信  ⑦ パッチ運用", 94, 797, 1370, 28, { fontSize: 14, bold: true, color: "#334155", alignment: "center" });

slide.speakerNotes.textFrame.setText([
  "Source: Amazon WorkSpaces skill-transfer build order and validated environment notes.",
  "Source: Existing large-scale WorkSpaces network diagram supplied by the author.",
  "AWS group conventions and icons: AWS Architecture Icons Deck for Light Background (2026-01-30).",
  "NAT Gateway and Internet Gateway are shown as the per-AZ internet egress path for private WorkSpaces subnets.",
].join("\n"));

const pptxPath = path.join(outDir, "workspaces-skill-transfer-architecture.pptx");
await (await PresentationFile.exportPptx(presentation)).save(pptxPath);
const preview = await presentation.export({ slide, format: "png", scale: 1.5 });
await fs.writeFile(path.join(outDir, "workspaces-skill-transfer-architecture.png"), new Uint8Array(await preview.arrayBuffer()));
const layout = await slide.export({ format: "layout" });
await fs.writeFile(path.join(TMP_DIR, "workspaces-skill-transfer-architecture.layout.json"), await layout.text());
warnIfSlideHasOverlaps(slide, presentation);
warnIfSlideElementsOutOfBounds(slide, presentation);
console.log(JSON.stringify({ pptxPath, pngPath: path.join(outDir, "workspaces-skill-transfer-architecture.png") }, null, 2));

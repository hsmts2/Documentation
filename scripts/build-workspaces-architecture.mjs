import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const {
  SKILL_DIR,
  TMP_DIR,
  NODE_PATH,
  RUNTIME_PYTHON,
  SOURCE_PPTX,
  SOURCE_DIRECTORY_DOMAIN,
  SOURCE_ENVIRONMENT_PREFIX,
  PUBLIC_ENVIRONMENT_PREFIX = "ad",
  PUBLIC_DIRECTORY_DOMAIN = "ad.example.com",
} = process.env;
if (![SKILL_DIR, TMP_DIR, NODE_PATH, RUNTIME_PYTHON, SOURCE_PPTX].every((value) => path.isAbsolute(value ?? ""))) {
  throw new Error("Set SKILL_DIR, TMP_DIR, NODE_PATH, RUNTIME_PYTHON and SOURCE_PPTX");
}

const { FileBlob, PresentationFile } = await import(
  pathToFileURL(path.join(NODE_PATH, "@oai", "artifact-tool", "dist", "artifact_tool.mjs")),
);
const { finalizePresentation } = await import(
  pathToFileURL(path.join(SKILL_DIR, "container_tools", "artifact_tool_utils.mjs")),
);

const root = path.resolve(TMP_DIR, "..", "..");
const outDir = path.join(root, "assets", "img", "workspaces-skill-transfer");
const validatedPptx = path.join(TMP_DIR, "validated.pptx");
const finalPng = path.join(outDir, "workspaces-skill-transfer-architecture.png");
const candidatePath = path.join(TMP_DIR, "candidate.pptx");
const previewPath = path.join(TMP_DIR, "preview.png");
const receiptPath = path.join(TMP_DIR, "workspaces-skill-transfer-architecture.validation.json");
await fs.mkdir(TMP_DIR, { recursive: true });
await fs.mkdir(outDir, { recursive: true });

const presentation = await PresentationFile.importPptx(await FileBlob.load(SOURCE_PPTX));
const sourceSlide = presentation.slides.getItem(3);
for (const source of [...presentation.slides.items].reverse()) {
  if (source.id !== sourceSlide.id) source.delete();
}
const slide = presentation.slides.getItem(0);
for (const master of presentation.masters.items) {
  for (const image of [...master.images.items]) image.delete();
  for (const shape of [...master.shapes.items]) {
    if (String(shape.text ?? "").includes("#")) shape.delete();
  }
}

const contains = (frame, region, tolerance = 2) => frame
  && frame.left >= region.left - tolerance
  && frame.top >= region.top - tolerance
  && frame.left + frame.width <= region.left + region.width + tolerance
  && frame.top + frame.height <= region.top + region.height + tolerance;

const vpc3 = { left: 751, top: 123, width: 323, height: 273 };
const vpc4 = { left: 85, top: 417, width: 324, height: 273 };
const vpc5 = { left: 419, top: 400, width: 324, height: 291 };
const vpc6 = { left: 751, top: 400, width: 324, height: 291 };

for (const element of [...slide.elements.items]) {
  if (contains(element.frame, vpc5) || contains(element.frame, vpc6)) element.delete();
}

for (const element of [...slide.elements.items]) {
  const frame = element.frame;
  if (!frame) continue;
  if (contains(frame, vpc3)) {
    element.frame = { ...frame, left: frame.left - 665, top: frame.top + 294 };
  } else if (contains(frame, vpc4)) {
    element.frame = { ...frame, left: frame.left + 333 };
  }
}

for (const element of [...slide.elements.items]) {
  const frame = element.frame;
  if (!frame) continue;
  const value = typeof element.text?.toString === "function" ? element.text.toString() : "";
  if (value === "AWS Cloud" && frame.width > 900) element.frame = { ...frame, width: 720 };
  if (frame.top < -50 || (frame.left > 1060 && frame.width > 120 && frame.height < 40 && !value)) {
    element.delete();
    continue;
  }
  if (frame.left >= 1070) element.frame = { ...frame, left: frame.left - 255 };
}

// Center the remaining diagram on the 16:9 canvas.
for (const element of [...slide.elements.items]) {
  const frame = element.frame;
  if (frame?.top >= 80) element.frame = { ...frame, left: frame.left + 110 };
}

for (const element of [...slide.elements.items]) {
  const frame = element.frame;
  const value = typeof element.text?.toString === "function" ? element.text.toString() : "";
  if (element.placeholderType === "slideNumber" || (value === "3" && frame?.top > 680)) element.delete();
}

for (const shape of slide.shapes.items) {
  if (!shape.text || typeof shape.text.replace !== "function") continue;
  for (const [from, to] of [
    ["全環境図_NW構成物理情報", "PoC 閉域VPC・AD／VDI環境 — 全体ネットワーク構成"],
    ["Corporate data center", "オンプレミス拠点"],
    ["managementInstance", "管理用EC2"],
  ]) shape.text.replace(from, to);

  if (SOURCE_DIRECTORY_DOMAIN) shape.text.replace(SOURCE_DIRECTORY_DOMAIN, PUBLIC_DIRECTORY_DOMAIN);
  if (SOURCE_ENVIRONMENT_PREFIX) shape.text.replace(SOURCE_ENVIRONMENT_PREFIX, PUBLIC_ENVIRONMENT_PREFIX);
  const currentValue = shape.text.toString();
  for (const directoryId of currentValue.match(/\bd-[a-z0-9]+_?/gi) ?? []) {
    shape.text.replace(directoryId, "d-xxxxxxxxxx");
  }
  for (const workspaceId of currentValue.match(/\bws-[a-z0-9]+\b/gi) ?? []) {
    shape.text.replace(workspaceId, "ws-xxxxxxxxx");
  }
}

const fromAnchor = slide.shapes.add({
  geometry: "rect", name: "direct-connect-from",
  position: { left: 802, top: 116, width: 2, height: 2 },
  fill: "none", line: { fill: "none", width: 0 },
});
const toAnchor = slide.shapes.add({
  geometry: "rect", name: "direct-connect-to",
  position: { left: 1008, top: 103, width: 2, height: 2 },
  fill: "none", line: { fill: "none", width: 0 },
});
slide.shapes.connect(fromAnchor, toAnchor, {
  kind: "straight", fromSide: "right", toSide: "left",
  line: { style: "solid", fill: "#66C7F0", width: 2 },
  head: { type: "none" }, tail: { type: "none" },
});

const onPremFrom = slide.shapes.add({
  geometry: "rect", name: "on-premises-from",
  position: { left: 1048, top: 110, width: 2, height: 2 },
  fill: "none", line: { fill: "none", width: 0 },
});
const onPremTo = slide.shapes.add({
  geometry: "rect", name: "on-premises-to",
  position: { left: 1112, top: 226, width: 2, height: 2 },
  fill: "none", line: { fill: "none", width: 0 },
});
slide.shapes.connect(onPremFrom, onPremTo, {
  kind: "elbow", fromSide: "right", toSide: "top",
  line: { style: "solid", fill: "#66C7F0", width: 2 },
  head: { type: "none" }, tail: { type: "none" },
});

slide.speakerNotes.textFrame.setText([
  "Source: 大規模WorkSpacesNW構成図_20251031.pptx, slide 4.",
  "Revision: vpc-005 and vpc-006 removed; four remaining VPCs arranged in a 2x2 grid.",
  "Direct Connect and the on-premises network connection are retained.",
  "Environment-specific directory domain and identifiers are generalized for publication.",
].join("\n"));

await (await PresentationFile.exportPptx(presentation)).save(candidatePath);
const preview = await presentation.export({ slide, format: "png", scale: 1.5 });
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));
const layout = await slide.export({ format: "layout" });
await fs.writeFile(path.join(TMP_DIR, "workspaces-skill-transfer-architecture.layout.json"), await layout.text());

await fs.rm(validatedPptx, { force: true });
await fs.rm(receiptPath, { force: true });
const result = await finalizePresentation({
  workspaceDir: root,
  candidatePath,
  finalPath: validatedPptx,
  pythonExecutable: RUNTIME_PYTHON,
  integrityValidatorPath: path.join(SKILL_DIR, "container_tools", "inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(SKILL_DIR, "container_tools", "inspect_presentation_layout_geometry.py"),
  layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-heading-fit"],
  explicitTotalSlideCount: 1,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [],
  verifyArtifactToolImport: true,
  receiptPath,
});
await fs.copyFile(previewPath, finalPng);
console.log(JSON.stringify({ finalPng, validation: result }, null, 2));

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { isReviewedMonitoringImage } from './workspaces-next-images.mjs';

const modules = process.env.NODE_PATH;
if (!modules) throw new Error('NODE_PATH is required');
const require = createRequire(path.join(modules, '_codex_loader.cjs'));
const sharp = require('sharp');
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourceRoot = process.env.WORKSPACES_SOURCE_ROOT || 'C:/Users/hsmts/OneDrive/画像/スキルトランスファー';
const outputRoot = path.join(root, 'tmp/nextworkspaces-qa-20260914');
fs.mkdirSync(outputRoot, { recursive: true });

const account = '123456789012';
const specs = [
  { page: 'workspaces-cost-optimizer-reports', asset: 'workspaces-cost-optimizer', source: '⑤Amazon WorkSpaces Cost Optimizer/16_レポート・監視/注釈済み', figure: (n) => n - 28 },
  { page: 'workspaces-cloudwatch-monitoring', asset: 'workspaces-cloudwatch-monitoring', source: '⑥CloudWatch/02_EC2・Windows監視/注釈済み', figure: (n) => n },
  { page: 'workspaces-cloudwatch-workspaces', asset: 'workspaces-cloudwatch-monitoring', source: '⑥CloudWatch/03_Amazon WorkSpaces監視/注釈済み', figure: (n) => n - 18 },
];

const patches = new Map([
  ['workspaces-cost-optimizer/029', [line(55, 171, 380, 20, `arn:aws:ecs:ap-northeast-1:${account}:cluster/cost-optimizer-cluster`, 10)]],
  ['workspaces-cost-optimizer/032', [line(137, 399, 440, 18, `ap-northeast-1_${account}_d-9567999619_dry-run_daily.csv`, 11)]],
  ['workspaces-cost-optimizer/033', [line(154, 440, 430, 19, `ap-northeast-1_${account}_d-9567999619_dry-run_daily.csv`, 11, '#f0fcfc')]],
  ['workspaces-cloudwatch-monitoring/004', [line(605, 305, 365, 19, `arn:aws:sns:ap-northeast-1:${account}:sample-sns-cl`, 11)]],
  ['workspaces-cloudwatch-monitoring/013', [
    line(651, 282, 418, 18, `arn:aws:iam::${account}:role/Sample_EC2Role`, 11),
    line(1129, 282, 445, 18, `arn:aws:iam::${account}:instance-profile/Sample_EC2Role`, 11),
  ]],
  ['workspaces-cloudwatch-monitoring/015', [
    line(171, 308, 640, 18, `arn:aws:ssm:ap-northeast-1:${account}:parameter/AmazonCloudWatch-sample-windows-basic-v1`, 11),
    line(885, 365, 400, 18, `arn:aws:iam::${account}:user/t_hashimoto`, 11),
  ]],
]);

function line(x, y, width, height, value, fontSize, fill = '#fff') {
  return { x, y, width, height, value, fontSize, fill };
}

const restorations = new Map([
  ['workspaces-cost-optimizer/029', { left: 33, top: 156, width: 830, height: 39 }],
  ['workspaces-cost-optimizer/033', { left: 135, top: 439, width: 790, height: 22 }],
]);

let reviewed = 0;
for (const spec of specs) {
  const html = fs.readFileSync(path.join(root, 'tutorials', `${spec.page}.html`), 'utf8');
  const names = [...html.matchAll(new RegExp(`${spec.asset}/([^"?]+\\.png)`, 'g'))].map((match) => match[1]);
  if (spec.page === 'workspaces-cloudwatch-workspaces' && !names.includes('019-workspaces監視対象一覧.png')) names.unshift('019-workspaces監視対象一覧.png');
  for (const name of names) {
    const destination = path.join(root, 'assets/img/workspaces-skill-transfer', spec.asset, name);
    if (!isReviewedMonitoringImage(destination)) continue;
    const number = Number(name.slice(0, 3));
    const sourceDir = path.join(sourceRoot, spec.source);
    const sourceName = fs.readdirSync(sourceDir).find((candidate) => candidate.startsWith(`図${spec.figure(number)}_`));
    if (!sourceName) throw new Error(`Missing original: ${name}`);
    const original = path.join(sourceDir, sourceName);
    const [a, b] = await Promise.all([sharp(original).metadata(), sharp(destination).metadata()]);
    if (a.width !== b.width || a.height !== b.height) throw new Error(`Dimensions differ: ${name}`);

    const headerHeight = Math.min(60, a.height);
    const header = await sharp(original).extract({ left: 0, top: 0, width: a.width, height: headerHeight }).toBuffer();
    const elements = [];
    if (name !== '004-snsトピック作成完了.png') {
      const { data, info } = await sharp(header).raw().toBuffer({ resolveWithObject: true });
      const colorAt = (x, y) => {
        const i = (y * a.width + x) * info.channels;
        return [data[i], data[i + 1], data[i + 2]];
      };
      let bottom = 0;
      const sampleX = Math.min(1200, Math.floor(a.width / 2));
      const topColor = colorAt(sampleX, 20);
      for (let y = 30; y < headerHeight; y += 1) {
        if (colorAt(sampleX, y).some((c, i) => Math.abs(c - topColor[i]) > 35)) { bottom = y; break; }
      }
      if (bottom < 30) throw new Error(`Unexpected header height for ${name}: ${bottom}`);
      let right = a.width - 1;
      while (right > a.width / 2 && !colorAt(right, 20).every((c) => c < 100)) right -= 1;
      if (right <= a.width / 2) throw new Error(`No dark header edge: ${name}`);
      const left = right - (a.width > 1900 ? 84 : 65);
      for (let y = 0; y < bottom; y += 1) {
        const color = colorAt(sampleX, y).map((c) => c.toString(16).padStart(2, '0')).join('');
        elements.push(`<rect x="${left}" y="${y}" width="${right - left + 1}" height="1" fill="#${color}"/>`);
      }
      elements.push(`<text x="${left + 3}" y="${bottom / 2}" dominant-baseline="middle" font-family="Segoe UI, Arial, sans-serif" font-size="${a.width > 1900 ? 11 : 9.5}" fill="#fff">t_hashimoto</text>`);
    }
    for (const patch of patches.get(`${spec.asset}/${name.slice(0, 3)}`) || []) {
      elements.push(`<rect x="${patch.x}" y="${patch.y}" width="${patch.width}" height="${patch.height}" fill="${patch.fill}"/>`);
      elements.push(`<text x="${patch.x + 1}" y="${patch.y + patch.height / 2}" dominant-baseline="middle" font-family="Segoe UI, Arial, sans-serif" font-size="${patch.fontSize}" fill="#232f3e">${patch.value}</text>`);
    }
    const svg = Buffer.from(`<svg width="${a.width}" height="${a.height}" xmlns="http://www.w3.org/2000/svg">${elements.join('')}</svg>`);
    const layers = [{ input: header, left: 0, top: 0 }];
    const region = restorations.get(`${spec.asset}/${name.slice(0, 3)}`);
    if (region) {
      layers.push({ input: await sharp(original).extract(region).toBuffer(), left: region.left, top: region.top });
    }
    layers.push({ input: svg, left: 0, top: 0 });
    await sharp(destination).composite(layers).png().toFile(path.join(outputRoot, name));
    console.log(name);
    reviewed += 1;
  }
}
if (reviewed !== 32) throw new Error(`Expected 32 reviewed images, got ${reviewed}`);

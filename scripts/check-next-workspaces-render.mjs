import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const modules = process.env.NODE_PATH;
if (!modules) throw new Error('NODE_PATH is required');
const require = createRequire(path.join(modules, '_codex_loader.cjs'));
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
const expectations = [
  ['workspaces-cost-optimizer-reports', 9],
  ['workspaces-cloudwatch-monitoring', 18],
  ['workspaces-cloudwatch-workspaces', 6],
];

try {
  for (const [name, expectedImages] of expectations) {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 800 } });
      try {
        await page.goto(pathToFileURL(path.resolve(`tutorials/${name}.html`)).href);
        const section = page.locator('section.procedure-document');
        assert.equal(await section.locator('h2', { hasText: '前提条件' }).count(), 1);
        assert.equal(await section.locator('li input[type="checkbox"], ul.check-list').count(), 0);
        const images = await section.locator('img').evaluateAll(async (nodes) => {
          nodes.forEach((node) => { node.loading = 'eager'; });
          await Promise.all(nodes.map((node) => node.decode().catch(() => {})));
          return nodes.map((node) => ({ src: node.src, width: node.naturalWidth, alt: node.alt }));
        });
        assert.equal(images.length, expectedImages, `${name}: image count`);
        assert.deepEqual(images.filter((image) => !image.width || !image.alt), [], `${name}: broken image/alt`);
        const reviewed = images.filter((image) => !image.src.includes('/001-'));
        assert.ok(reviewed.every((image) => image.src.includes('?v=20260914')), `${name}: stale image URL`);
        const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
        assert.equal(horizontalOverflow, false, `${name} ${width}px: horizontal overflow`);
        console.log(`${name} ${width}px: ${images.length} images loaded`);
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const directories = ['packages/shared/styles', 'packages/guest/src/styles', 'packages/miniapp/src/styles'];
const spacingProperty = /^(?:margin|padding|gap|row-gap|column-gap|scroll-margin|scroll-padding)(?:-(?:top|right|bottom|left|inline|block|inline-start|inline-end|block-start|block-end))?$/;
const literalLength = /(^|[^\w-])-?(?!0(?:\.0+)?(?:px|rem|em)\b)(\d+(?:\.\d+)?)(px|rem|em)\b/g;
const violations = [];

for (const directory of directories) {
  const absolute = path.join(root, directory);
  for (const filename of fs.readdirSync(absolute)) {
    if (!filename.endsWith('.css') || filename.startsWith('figma-')) continue;
    const file = path.join(absolute, filename);
    const sheet = postcss.parse(fs.readFileSync(file, 'utf8'), { from: file });
    sheet.walkDecls((declaration) => {
      if (!spacingProperty.test(declaration.prop)) return;
      for (const match of declaration.value.matchAll(literalLength)) {
        violations.push(`${path.relative(root, file)}:${declaration.source.start.line}: ${declaration.prop} uses ${match[2]}${match[3]}`);
      }
    });
  }
}

if (violations.length) {
  console.error(`Fixed spacing must use --invite-space-N tokens:\n${violations.join('\n')}`);
  process.exitCode = 1;
} else console.log('Verified fixed CSS spacing uses shared tokens.');

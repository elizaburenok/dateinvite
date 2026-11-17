import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../../..');
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'figma-tokens.json'), 'utf8'));
const spacingManifest = JSON.parse(fs.readFileSync(path.join(directory, 'figma-spacing.json'), 'utf8'));
const check = process.argv.includes('--check');
const variables = new Map(manifest.variables.map((variable) => [variable.id, variable]));
const round = (number) => Number(number.toFixed(6));
function resolve(variable, chain = new Set()) {
  if (chain.has(variable.id)) throw new Error(`Cyclic alias: ${variable.name}`);
  chain.add(variable.id);
  const value = Object.values(variable.valuesByMode)[0];
  if (value?.type === 'VARIABLE_ALIAS') {
    const target = variables.get(value.id);
    if (!target) throw new Error(`Missing alias: ${value.id}`);
    return resolve(target, chain);
  }
  if (!value || !['r', 'g', 'b'].every((key) => Number.isFinite(value[key]))) {
    throw new Error(`Invalid color: ${variable.name}`);
  }
  return value;
}
const cssName = (variable) => {
  const match = variable.codeSyntax.WEB?.match(/^var\((--[\w-]+)\)$/);
  if (!match) throw new Error(`Missing CSS syntax: ${variable.name}`);
  return match[1];
};
const rgba = (value) => `rgb(${['r', 'g', 'b'].map((key) => round(value[key] * 255)).join(' ')} / ${round(value.a ?? 1)})`;
const replacements = {};
const declarations = manifest.variables.map((variable) => {
  const name = cssName(variable);
  replacements[name] = rgba(resolve(variable));
  return `  /* ${variable.name} · ${variable.id} */\n  ${name}: ${replacements[name]};`;
});
const gradient = manifest.paintStyles.find((style) => style.name === 'Gradient/Primary')?.paints[0];
if (gradient?.type !== 'GRADIENT_LINEAR' || gradient.gradientStops.length !== 3) throw new Error('Missing primary gradient');
const stops = gradient.gradientStops.map((stop) => {
  const variable = variables.get(stop.boundVariables?.color?.id);
  if (!variable) throw new Error('Gradient stop must be bound to a variable');
  return { offset: round(stop.position), cssVariable: cssName(variable) };
});
const opacity = round(gradient.opacity ?? 1);
replacements['--invite-gradient-primary-opacity'] = String(opacity);
declarations.push(`  --invite-gradient-primary-opacity: ${opacity};`);
stops.forEach((stop, index) => {
  const name = `--invite-gradient-primary-position-${index + 1}`;
  replacements[name] = String(stop.offset);
  declarations.push(`  ${name}: ${stop.offset};`);
});
declarations.push(`  --invite-gradient-primary: linear-gradient(45deg, ${stops.map((stop) => `var(${stop.cssVariable}) ${round(stop.offset * 100)}%`).join(', ')});`);
const header = 'Generated from packages/shared/design/figma-tokens.json. Run npm run tokens:generate; do not edit.';
const outputs = new Map([
  ['packages/shared/styles/figma-tokens.css', `/* ${header}\n * Source: https://www.figma.com/design/${manifest.fileKey}/Untitled?node-id=${manifest.pageId.replace(':', '-')}\n * Gradient direction belongs to each SVG/Canvas consumer; the CSS swatch uses 45deg.\n */\n:root {\n${declarations.join('\n')}\n}\n`],
  ['packages/shared/src/design-tokens.ts', `/** ${header} */\nexport const PRIMARY_GRADIENT = ${JSON.stringify({ stops, opacityVariable: '--invite-gradient-primary-opacity' }, null, 2)} as const;\n`],
]);
const spacing = spacingManifest.variables
  .map((variable) => ({ variable, value: Object.values(variable.valuesByMode)[0] }))
  .sort((a, b) => a.value - b.value);
if (spacing.length !== 60 || spacing.some(({ variable, value }, index) =>
  variable.type !== 'FLOAT' || value !== (index + 1) * 2 ||
  variable.name !== `Spacing/${String(value).padStart(3, '0')}` ||
  cssName(variable) !== `--invite-space-${value}` ||
  !variable.scopes.includes('GAP'))) {
  throw new Error('Spacing library must contain GAP variables from 2 to 120px in 2px steps');
}
outputs.set('packages/shared/styles/figma-spacing.css',
  `/* Generated from packages/shared/design/figma-spacing.json. Run npm run tokens:generate; do not edit. */\n:root {\n${spacing.map(({ variable, value }) => `  /* ${variable.name} · ${variable.id} */\n  ${cssName(variable)}: ${value}px;`).join('\n')}\n}\n`);
const tokenSource = outputs.get('packages/shared/src/design-tokens.ts');
outputs.set('packages/shared/src/design-tokens.ts',
  `${tokenSource}\n/** Pixel values for drawing contexts that cannot use CSS variables. */\nexport const SPACING = ${JSON.stringify(Object.fromEntries(spacing.map(({ value }) => [value, value])), null, 2)} as const;\n`);
const assets = JSON.parse(fs.readFileSync(path.join(directory, 'svg-assets.json'), 'utf8'));
for (const asset of assets) {
  let svg = fs.readFileSync(path.join(directory, asset.template), 'utf8');
  svg = svg.replace(/\{\{(--[\w-]+)\}\}/g, (_, token) => {
    if (!(token in replacements)) throw new Error(`Unknown SVG token: ${token}`);
    return replacements[token];
  });
  if (svg.includes('{{')) throw new Error(`Unresolved placeholder: ${asset.template}`);
  outputs.set(asset.output, svg);
}
const drift = [];
for (const [relative, content] of outputs) {
  const output = path.join(root, relative);
  if (fs.existsSync(output) && fs.readFileSync(output, 'utf8') === content) continue;
  if (check) drift.push(relative);
  else { fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, content); }
}
if (drift.length) { console.error(`Generated tokens are stale:\n${drift.join('\n')}`); process.exitCode = 1; }
else console.log(`${check ? 'Verified' : 'Generated'} ${manifest.variables.length} color tokens, ${spacing.length} spacing tokens, ${stops.length} gradient stops and ${assets.length} SVG assets.`);

// Renders the Mermaid class diagram embedded in the README to docs/classes.png.
// The README is the single source of truth for the diagram (including its colors).
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';

const readme = readFileSync('README.md', 'utf8');
const match = readme.match(/```mermaid\n([\s\S]*?)```/);
if (!match) {
  throw new Error('No Mermaid diagram found in README.md');
}
const diagram = match[1];

// mermaid-cli ignores classDef fills for class diagrams, so translate the
// classDef rules from the README into a CSS file it does honor. This keeps the
// colors defined once, in the README.
const rules = [];
for (const [, name, body] of diagram.matchAll(/classDef\s+(\S+)\s+([^;\n]+)/g)) {
  const props = Object.fromEntries(body.split(',').map((prop) => prop.split(':').map((part) => part.trim())));
  const box = [];
  if (props.fill) box.push(`fill: ${props.fill} !important`);
  if (props.stroke) box.push(`stroke: ${props.stroke} !important`);
  if (box.length) {
    rules.push(`g.node.${name} rect, g.node.${name} path, g.node.${name} polygon { ${box.join('; ')}; }`);
  }
  if (props.color) {
    rules.push(`g.node.${name} .label, g.node.${name} text { fill: ${props.color} !important; }`);
  }
}

mkdirSync('docs', { recursive: true });
// Write the extracted diagram and generated CSS next to the output (gitignored
// paths without spaces, so they work across platforms) and remove them again.
const source = 'docs/classes.mmd';
const css = 'docs/classes.css';
writeFileSync(source, diagram);
if (rules.length) {
  writeFileSync(css, rules.join('\n') + '\n');
}

try {
  // All tokens are fixed literals (no user input), so a shell command is safe here.
  const cssArg = rules.length ? ` -C ${css}` : '';
  execSync(`npx -y -p @mermaid-js/mermaid-cli mmdc -i ${source} -o docs/classes.png -b transparent${cssArg}`, {
    stdio: 'inherit',
  });
} finally {
  rmSync(source, { force: true });
  rmSync(css, { force: true });
}

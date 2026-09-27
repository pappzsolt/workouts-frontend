const fs = require('node:fs');
const path = require('node:path');

const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const outputDir = path.resolve(__dirname, '..', 'src', 'app', 'config');
const outputPath = path.join(outputDir, 'app-version.ts');

fs.mkdirSync(outputDir, { recursive: true });

const content = `// This file is generated from package.json by npm run update-version.\n` +
  `export const APP_VERSION = '${packageJson.version}';\n`;

fs.writeFileSync(outputPath, content, 'utf8');
console.log(`Frontend version: ${packageJson.version}`);

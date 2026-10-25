const fs = require('node:fs');
const path = require('node:path');
const v8ToIstanbul = require('v8-to-istanbul');
const { createCoverageMap } = require('istanbul-lib-coverage');
const { createContext } = require('istanbul-lib-report');
const reports = require('istanbul-reports');
const { createInstrumenter } = require('istanbul-lib-instrument');
const root = path.resolve(__dirname, '../..');
const input = path.resolve(__dirname, '../live-api-results');
const output = path.resolve(__dirname, '../live-api-coverage');
function files(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}
(async () => {
  const coverage = createCoverageMap({});
  let measuredScripts = 0;
  const unmappedScripts = new Set();
  for (const file of files(input).filter(file => path.basename(file) === 'coverage.json')) {
    for (const entry of JSON.parse(fs.readFileSync(file, 'utf8'))) {
      if (!entry.sourceMap) { unmappedScripts.add(entry.url); continue; }
      if (!entry.sourceMap.sources.some(source => source.startsWith('src/') || source.includes('/src/') && !source.includes('/node_modules/'))) continue;
      const converter = v8ToIstanbul(path.join(root, new URL(entry.url).pathname), 0,
        { source: entry.source, originalSource: '', sourceMap: { sourcemap: entry.sourceMap } });
      await converter.load(); converter.applyCoverage(entry.functions);
      const mapped = converter.toIstanbul();
      for (const [fileName, data] of Object.entries(mapped)) {
        const absolute = path.resolve(fileName);
        if (absolute.startsWith(path.join(root, 'src') + path.sep) && !absolute.endsWith('.spec.ts')) coverage.merge({ [absolute]: data });
      }
      converter.destroy(); measuredScripts++;
    }
  }
  if (!coverage.files().length) throw new Error('No application source coverage was recorded; refusing an empty success.');
  // Inventory every authored TypeScript file, not only modules imported by this test run.
  const unmeasured = [];
  for (const file of files(path.join(root, 'src')).filter(file => file.endsWith('.ts') && !file.endsWith('.spec.ts') && !file.endsWith('.d.ts') && !coverage.files().includes(file))) {
    const instrumenter = createInstrumenter({ parserPlugins: ['typescript', 'decorators-legacy'] });
    instrumenter.instrumentSync(fs.readFileSync(file, 'utf8'), file);
    const zero = instrumenter.lastFileCoverage();
    coverage.addFileCoverage(zero);
    unmeasured.push({ file, executableStatements: Object.keys(zero.s).length });
  }
  fs.mkdirSync(output, { recursive: true });
  const context = createContext({ dir: output, coverageMap: coverage });
  for (const format of ['html', 'json', 'json-summary', 'text-summary']) reports.create(format).execute(context);
  fs.writeFileSync(path.join(output, 'unmeasured-sources.json'), JSON.stringify({ unmeasured, unmappedScripts: [...unmappedScripts], measuredScripts }, null, 2));
  console.log(`${coverage.files().length} inventoried application sources; ${unmeasured.filter(file => file.executableStatements).length} executable TypeScript files not loaded (recorded at zero coverage).`);
  if (process.argv.includes('--strict')) {
    const summary = coverage.getCoverageSummary().toJSON();
    if (['lines','statements','branches','functions'].some(metric => summary[metric].pct !== 100) || unmeasured.some(file => file.executableStatements) || unmappedScripts.size > 0) {
      throw new Error('100% coverage not achieved or a loaded script has no source map; see live-api-coverage. No source file was removed to make this check pass.');
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

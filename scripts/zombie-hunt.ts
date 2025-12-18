import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { Worker } from 'node:worker_threads';

const REPO_ROOT = process.cwd();
const SRC_DIR = path.join(REPO_ROOT, 'src');
const SERVER_DIR = path.join(REPO_ROOT, 'server');

const ENTRY_POINTS = [
  path.join(SRC_DIR, 'main.tsx'),
  path.join(SERVER_DIR, 'index.ts'),
];

const IGNORE_PATTERNS = [
  /node_modules/,
  /\.d\.ts$/,
  /\.test\.ts$/,
  /\.spec\.ts$/,
];

async function collectFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
          files.push(...(await collectFiles(fullPath)));
        }
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        if (!IGNORE_PATTERNS.some((p) => p.test(fullPath))) {
          files.push(fullPath);
        }
      }
    }
  } catch (err) {
    // Directory might not exist
  }
  return files;
}

type FileData = {
  filePath: string;
  imports: { path: string; symbols: string[] }[];
  exports: string[];
};

async function runHunt() {
  console.log('\n🧟  ZOMBIE HUNT: DIVIDE OR BE CONQUERED');
  console.log('---------------------------------------');
  const startTime = Date.now();

  const allFiles = [...(await collectFiles(SRC_DIR)), ...(await collectFiles(SERVER_DIR))];
  const fileExistsSet = new Set(allFiles);

  const cpuCount = os.cpus().length;
  const chunkSize = Math.ceil(allFiles.length / cpuCount);
  const results: FileData[] = [];
  const workers: Promise<void>[] = [];

  for (let i = 0; i < cpuCount; i++) {
    const chunk = allFiles.slice(i * chunkSize, (i + 1) * chunkSize);
    if (chunk.length === 0) continue;

    workers.push(
      new Promise((resolve, reject) => {
        const worker = new Worker(new URL('./zombie-hunt-worker.ts', import.meta.url), {
          workerData: { chunk },
        });
        worker.on('message', (data: FileData[]) => {
          results.push(...data);
        });
        worker.on('error', reject);
        worker.on('exit', (code) => {
          if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
          else resolve();
        });
      })
    );
  }

  await Promise.all(workers);

  const fileMap = new Map<string, FileData>();
  for (const data of results) {
    fileMap.set(data.filePath, data);
  }

  function resolveImport(sourceFile: string, importPath: string): string | null {
    const cleanImportPath = importPath.split('?')[0];
    if (cleanImportPath.startsWith('.')) {
      const absoluteBase = path.resolve(path.dirname(sourceFile), cleanImportPath);
      const extensions = ['.tsx', '.ts', '.jsx', '.js'];
      if (fileExistsSet.has(absoluteBase)) return absoluteBase;
      for (const ext of extensions) {
        if (fileExistsSet.has(absoluteBase + ext)) return absoluteBase + ext;
      }
      for (const ext of extensions) {
        const indexFile = path.join(absoluteBase, 'index' + ext);
        if (fileExistsSet.has(indexFile)) return indexFile;
      }
    }
    return null;
  }

  // Reachability
  const reachableFiles = new Set<string>();
  const queue = [...ENTRY_POINTS.filter(f => fileExistsSet.has(f))];

  while (queue.length > 0) {
    const currentPath = queue.shift()!;
    if (reachableFiles.has(currentPath)) continue;
    reachableFiles.add(currentPath);

    const data = fileMap.get(currentPath);
    if (!data) continue;

    for (const imp of data.imports) {
      const resolved = resolveImport(currentPath, imp.path);
      if (resolved && fileMap.has(resolved)) {
        queue.push(resolved);
      }
    }
  }

  const zombieFiles = allFiles.filter((f) => !reachableFiles.has(f) && !ENTRY_POINTS.includes(f));

  // Export usage
  const allImports = new Set<string>();
  for (const data of results) {
    for (const imp of data.imports) {
      const resolved = resolveImport(data.filePath, imp.path);
      if (resolved) {
        for (const sym of imp.symbols) {
          allImports.add(`${resolved}:${sym}`);
        }
      }
    }
  }

  const zombieExports: { filePath: string; symbol: string }[] = [];
  for (const data of results) {
    if (!reachableFiles.has(data.filePath)) continue;
    for (const exp of data.exports) {
      if (exp === '*') continue;
      if (!allImports.has(`${data.filePath}:${exp}`)) {
        zombieExports.push({ filePath: data.filePath, symbol: exp });
      }
    }
  }

  const duration = (Date.now() - startTime) / 1000;
  
  console.log(`Scan completed in ${duration.toFixed(2)}s`);
  console.log(`Files scanned: ${allFiles.length}`);
  console.log(`Cores used: ${cpuCount}`);

  if (zombieFiles.length > 0) {
    console.log(`\n=== 💀 ZOMBIE FILES (${zombieFiles.length}) ===`);
    console.log('These files are not reachable from any entry point.');
    zombieFiles.sort().forEach((f) => console.log(`  ${path.relative(REPO_ROOT, f)}`));
  } else {
    console.log('\n✨ No zombie files found!');
  }

  if (zombieExports.length > 0) {
    console.log(`\n=== 👻 ZOMBIE EXPORTS (${zombieExports.length}) ===`);
    console.log('These symbols are exported but never imported.');
    
    // Group by file
    const grouped: Record<string, string[]> = {};
    for (const e of zombieExports) {
      const rel = path.relative(REPO_ROOT, e.filePath);
      if (!grouped[rel]) grouped[rel] = [];
      grouped[rel].push(e.symbol);
    }

    Object.keys(grouped).sort().forEach(rel => {
      console.log(`  ${rel}:`);
      console.log(`    ${grouped[rel].join(', ')}`);
    });
  } else {
    console.log('\n✨ No zombie exports found!');
  }
  
  console.log('\n"Divide or be Conquered. Prune the dead weight."\n');
}

runHunt().catch(console.error);

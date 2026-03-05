import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import type { CliOptions } from './cli.js';
import { StorycapReporter } from './reporter.js';

const require = createRequire(import.meta.url);

export async function run(options: CliOptions): Promise<void> {
  // Resolve vitest from the target project's node_modules, not ours
  const projectRequire = createRequire(
    path.join(process.cwd(), 'package.json'),
  );
  const vitestNodePath = projectRequire.resolve('vitest/node');
  const { startVitest } = (await import(vitestNodePath)) as typeof import('vitest/node');

  const { fileFilters, testNamePattern } = options;

  // Resolve @storycap-testrun/browser ESM entry from storycap-cli's node_modules
  const browserPkgDir = path.dirname(
    require.resolve('@storycap-testrun/browser/package.json'),
  );
  const browserEntry = path
    .join(browserPkgDir, 'dist', 'index.mjs')
    .replace(/\\/g, '/');

  // Resolve @storycap-testrun/internal for the command handler
  const browserRealPkg = fs.realpathSync(browserPkgDir);
  const browserInternalRequire = createRequire(
    path.join(browserRealPkg, 'package.json'),
  );
  const internalEntry = browserInternalRequire
    .resolve('@storycap-testrun/internal')
    .replace(/\.js$/, '.mjs')
    .replace(/\\/g, '/');

  // Write temporary setup file inside target project's node_modules
  const cacheDir = path.join(process.cwd(), 'node_modules', '.storycap-cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  const tempSetupPath = path
    .join(cacheDir, `setup-${process.pid}.mjs`)
    .replace(/\\/g, '/');
  fs.writeFileSync(
    tempSetupPath,
    [
      `import { afterEach } from 'vitest';`,
      `import { page } from '@vitest/browser/context';`,
      `import { screenshot } from '${browserEntry}';`,
      ``,
      `afterEach(async (context) => {`,
      `  await screenshot(page, context);`,
      `});`,
    ].join('\n'),
  );

  // Write a wrapper vitest config that extends the user's config
  // and injects our setup file into storybook project(s)
  const userConfigFile = findVitestConfig(process.cwd());
  const tempConfigPath = path.join(cacheDir, `vitest.config-${process.pid}.mjs`);
  const screenshotCommandPath = path
    .join(cacheDir, `command-${process.pid}.mjs`)
    .replace(/\\/g, '/');

  // Write the screenshot command handler as a proper module
  const outDir = path.resolve(options.outDir).replace(/\\/g, '/');
  fs.writeFileSync(
    screenshotCommandPath,
    [
      `import path from 'node:path';`,
      `import { resolveScreenshotFilename } from '${internalEntry}';`,
      ``,
      `const output = { dir: '${outDir}', file: path.join('[file]', '[name].png') };`,
      ``,
      `export async function resolveScreenshotFilepath(ctx, screenshotContext) {`,
      `  const filename = resolveScreenshotFilename(output, screenshotContext);`,
      `  return path.join(output.dir, filename);`,
      `}`,
    ].join('\n'),
  );

  const configLines = [
    `import originalConfig from './${path.relative(cacheDir, userConfigFile).replace(/\\/g, '/')}';`,
  ];
  if (!options.dryRun) {
    configLines.push(
      `import { resolveScreenshotFilepath } from './command-${process.pid}.mjs';`,
    );
  }
  configLines.push(
    ``,
    `const config = typeof originalConfig === 'function' ? originalConfig({}) : originalConfig;`,
    ``,
    `if (config.test?.projects) {`,
    `  for (const project of config.test.projects) {`,
    `    if (project.test?.browser?.enabled) {`,
  );
  if (!options.dryRun) {
    configLines.push(
      `      const setupFile = '${tempSetupPath}';`,
      `      project.test.setupFiles = [...(project.test.setupFiles || []), setupFile];`,
      `      if (!project.test.browser.commands) project.test.browser.commands = {};`,
      `      project.test.browser.commands.resolveScreenshotFilepath = resolveScreenshotFilepath;`,
    );
  }
  configLines.push(
    `      project.test.browser.viewport = { width: ${options.viewport.width}, height: ${options.viewport.height} };`,
    `      if (!project.test.browser.providerOptions) project.test.browser.providerOptions = {};`,
    `      if (!project.test.browser.providerOptions.context) project.test.browser.providerOptions.context = {};`,
    `      if (!project.test.browser.providerOptions.context.deviceScaleFactor) project.test.browser.providerOptions.context.deviceScaleFactor = 2;`,
  );
  if (options.headed) {
    configLines.push(`      project.test.browser.headless = false;`);
  }
  configLines.push(
    `    }`,
    `  }`,
    `}`,
    ``,
    `export default config;`,
  );
  const configContent = configLines.join('\n');
  if (options.debug) {
    console.log('[storycap] wrapper config:\n' + configContent);
  }
  fs.writeFileSync(tempConfigPath, configContent);

  try {
    const vitest = await startVitest(
      'test',
      fileFilters,
      {
        watch: false,
        config: tempConfigPath,
        reporters: options.debug
          ? ['default', new StorycapReporter({ dryRun: options.dryRun })]
          : [new StorycapReporter({ dryRun: options.dryRun })],
        ...(options.project ? { project: [options.project] } : {}),
        ...(testNamePattern ? { testNamePattern: new RegExp(testNamePattern) } : {}),
        ...(options.exclude.length > 0 ? { exclude: options.exclude } : {}),
      },
      {
        server: {
          fs: {
            allow: [browserPkgDir],
          },
        },
      },
    );

    if (!vitest) {
      console.error('Failed to start vitest');
      process.exitCode = 1;
      return;
    }

    await vitest.close();
  } finally {
    // Cleanup temp files
    for (const file of [tempSetupPath, tempConfigPath, screenshotCommandPath]) {
      try {
        fs.unlinkSync(file);
      } catch {
        // ignore cleanup errors
      }
    }
  }
}

function findVitestConfig(dir: string): string {
  const candidates = [
    'vitest.config.ts',
    'vitest.config.mts',
    'vitest.config.js',
    'vitest.config.mjs',
  ];
  for (const name of candidates) {
    const full = path.join(dir, name);
    if (fs.existsSync(full)) return full;
  }
  // Fallback to vite config
  const viteCandidates = ['vite.config.ts', 'vite.config.mts', 'vite.config.js'];
  for (const name of viteCandidates) {
    const full = path.join(dir, name);
    if (fs.existsSync(full)) return full;
  }
  throw new Error('No vitest or vite config file found');
}

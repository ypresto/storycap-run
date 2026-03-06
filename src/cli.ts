import cac from 'cac';
import { run } from './run.js';

function parseViewport(value: string): Viewport {
  const match = value.match(/^(\d+)x(\d+)$/);
  if (!match) {
    throw new Error(`Invalid viewport format: "${value}". Expected WIDTHxHEIGHT (e.g. "1280x800")`);
  }
  return { width: Number(match[1]), height: Number(match[2]) };
}

export type Viewport = {
  width: number;
  height: number;
};

export type CliOptions = {
  fileFilters: string[];
  testNamePattern: string | undefined;
  exclude: string[];
  outDir: string;
  viewport: Viewport;
  project: string | undefined;
  dryRun: boolean;
  headed: boolean;
  debug: boolean;
};

export function setupCli(argv: string[]): void {
  const cli = cac('storycap-run');

  cli
    .command('[...filters]', 'Capture Storybook screenshots via storycap-testrun')
    .option('-t, --testNamePattern <pattern>', 'Regex pattern to filter test names (combine with file filters for speed)')
    .option('--exclude <glob>', 'Exclude files matching glob pattern', { type: [] })
    .option('-o, --outDir <dir>', 'Output directory', { default: '__screenshots__' })
    .option('--viewport <size>', 'Viewport size as WIDTHxHEIGHT (e.g. "1280x800")', { default: '1280x800' })
    .option('--project <name>', 'Vitest project name to run (e.g. "storybook")')
    .option('--dryRun', 'List matched stories without capturing', { default: false })
    .option('--headed', 'Run browser in headed mode', { default: false })
    .option('--debug', 'Show debug output', { default: false })
    .action(async (filters: string[], options) => {
      const cliOptions: CliOptions = {
        fileFilters: filters,
        testNamePattern: options.testNamePattern,
        exclude: options.exclude ?? [],
        outDir: options.outDir,
        viewport: parseViewport(options.viewport),
        project: options.project,
        dryRun: options.dryRun,
        headed: options.headed,
        debug: options.debug,
      };
      await run(cliOptions);
    });

  cli.help();
  cli.version('0.1.0');
  cli.parse(argv);
}

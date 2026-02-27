import { defineCommand } from 'citty';
import { run } from './run.js';

export type CliOptions = {
  include: string[];
  exclude: string[];
  outDir: string;
  project: string | undefined;
  dryRun: boolean;
  headed: boolean;
  debug: boolean;
};

export const main = defineCommand({
  meta: {
    name: 'storycap-cli',
    version: '0.1.0',
    description:
      'Capture Storybook screenshots via storycap-testrun',
  },
  args: {
    include: {
      type: 'string',
      alias: 'i',
      description:
        'Include stories matching patterns (comma-separated, e.g. "Button/*,Card/Primary")',
    },
    exclude: {
      type: 'string',
      alias: 'e',
      description:
        'Exclude stories matching patterns (comma-separated)',
    },
    outDir: {
      type: 'string',
      alias: 'o',
      description: 'Output directory',
      default: '__screenshots__',
    },
    project: {
      type: 'string',
      description:
        'Vitest project name to run (e.g. "storybook"). Required if vitest config uses projects.',
    },
    dryRun: {
      type: 'boolean',
      description: 'List matched stories without capturing',
      default: false,
    },
    headed: {
      type: 'boolean',
      description: 'Run browser in headed mode',
      default: false,
    },
    debug: {
      type: 'boolean',
      description: 'Show debug output',
      default: false,
    },
  },
  async run({ args }) {
    const options: CliOptions = {
      include: args.include ? args.include.split(',') : [],
      exclude: args.exclude ? args.exclude.split(',') : [],
      outDir: args.outDir,
      project: args.project,
      dryRun: args.dryRun,
      headed: args.headed,
      debug: args.debug,
    };
    await run(options);
  },
});

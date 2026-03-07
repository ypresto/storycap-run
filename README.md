# storycap-run

CLI for capturing Storybook screenshots via [storycap-testrun](https://github.com/reg-viz/storycap-testrun).

Runs [vitest](https://vitest.dev/) with [@storybook/addon-vitest](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon) under the hood — no manual server or browser startup needed.

## Prerequisites

Your project must have `@storybook/addon-vitest` configured in `vitest.config.ts`:

```ts
// vitest.config.ts
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [storybookTest()],
  test: {
    browser: {
      enabled: true,
      provider: 'playwright',
      name: 'chromium',
    },
  },
});
```

## Install

```bash
pnpm add -D storycap-run
```

Peer dependencies:

- `vitest` >= 3.0.0
- `@storybook/addon-vitest` >= 8.0.0

## Usage

```bash
# npm
npx storycap-run

# pnpm
pnpm dlx storycap-run
```

Filtering works the same as vitest: positional args for file path matching, `-t` for test name regex.

```bash
# Capture all stories
npx storycap-run

# Filter by file path (substring match, like vitest)
npx storycap-run Button

# Multiple file filters (space-separated, like vitest)
npx storycap-run Button Card

# Filter by test name regex (like vitest -t)
npx storycap-run -t "Primary|Secondary"

# Combine file filter and test name filter
npx storycap-run Button -t "Primary"

# Exclude files by glob pattern (like vitest --exclude)
npx storycap-run --exclude "**/*.integration.stories.*"

# List matched stories without capturing
npx storycap-run --dryRun

# Custom output directory
npx storycap-run --outDir ./screenshots

# Select a specific vitest project
npx storycap-run --project storybook

# Run with browser visible
npx storycap-run --headed

# Override viewport size (uses Storybook config by default)
npx storycap-run --viewport 1920x1080

# Show vitest's default reporter output
npx storycap-run --debug
```

Screenshots are saved to `__screenshots__/` by default, organized by story file and story name (e.g. `__screenshots__/Button.stories/Primary.png`).

> **Tip:** `-t` alone filters only by test name — all files are still transformed and loaded (same as vitest). For faster runs, combine with file filters: `storycap-run Button -t "Primary"`

## Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `[...filters]` | | File path patterns (positional, space-separated) | all stories |
| `--testNamePattern` | `-t` | Regex pattern to filter test names | |
| `--exclude <glob>` | | Exclude files matching glob pattern (repeatable) | |
| `--outDir <dir>` | `-o` | Output directory | `__screenshots__` |
| `--viewport <WxH>` | | Override viewport size (e.g. `1920x1080`) | from Storybook |
| `--project <name>` | | Vitest project name to run (e.g. `storybook`) | |
| `--dryRun` | | List matched stories without capturing | `false` |
| `--headed` | | Run browser in headed (visible) mode | `false` |
| `--debug` | | Show vitest's default reporter output | `false` |

## How it works

1. Discovers your existing vitest config (with `storybookTest()` plugin)
2. Creates a temporary wrapper config that injects `@storycap-testrun/browser` setup into browser-enabled projects
3. Runs vitest in browser mode — stories render in a real browser
4. Captures screenshots with CDP metrics stability checks and hash-based retake verification
5. Saves screenshots to the output directory
6. Cleans up all temporary files

## Per-story configuration

Stories can configure screenshot behavior via [Storybook parameters](https://storybook.js.org/docs/writing-stories/parameters):

```ts
export const Primary: Story = {
  parameters: {
    screenshot: {
      skip: true,        // skip this story
      delay: 500,        // extra delay in ms
      mask: '.dynamic',  // mask elements with CSS selector
      remove: '.ads',    // remove elements before capture
    },
  },
};
```

## License

MIT

# storycap-cli

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
pnpm add -D storycap-cli
```

Peer dependencies:

- `vitest` >= 3.0.0
- `@storybook/addon-vitest` >= 8.0.0

## Usage

```bash
# Capture all stories
npx storycap-cli

# Capture specific stories by pattern
npx storycap-cli --include "Button/*"

# Capture multiple patterns
npx storycap-cli --include "Button/*,Card/Primary"

# Exclude specific stories
npx storycap-cli --exclude "Button/Disabled"

# Combine include and exclude
npx storycap-cli --include "Button/*" --exclude "Button/Disabled"

# List matched stories without capturing
npx storycap-cli --dryRun

# Custom output directory
npx storycap-cli --outDir ./screenshots

# Select a specific vitest project
npx storycap-cli --project storybook

# Run with browser visible
npx storycap-cli --headed

# Show vitest's default reporter output
npx storycap-cli --debug
```

Screenshots are saved to `__screenshots__/` by default, organized by story file and story name (e.g. `__screenshots__/Button.stories/Primary.png`).

## Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--include <patterns>` | `-i` | Include stories matching patterns (comma-separated) | all stories |
| `--exclude <patterns>` | `-e` | Exclude stories matching patterns (comma-separated) | none |
| `--outDir <dir>` | `-o` | Output directory | `__screenshots__` |
| `--project <name>` | | Vitest project name to run (e.g. `storybook`) | |
| `--dryRun` | | List matched stories without capturing | `false` |
| `--headed` | | Run browser in headed (visible) mode | `false` |
| `--debug` | | Show vitest's default reporter output | `false` |

## Pattern format

Patterns use the format `Title/Name` where `*` is a wildcard:

- `Button/*` — all stories under the "Button" title
- `Button/Primary` — the exact "Primary" story of "Button"
- `Components/Button/*` — nested title matching
- `*/*` — all stories

The title part matches against file paths (substring match), and the name part matches against test names (story export names like `Primary`, `Default`).

> **Note:** `--exclude` applies name-based filtering via regex negative lookahead. File-level exclusion by title is not supported.

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

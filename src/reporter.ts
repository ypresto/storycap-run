import type { Reporter } from 'vitest/reporters';

export class StorycapReporter implements Reporter {
  private captured = 0;
  private failed = 0;
  private total = 0;
  private dryRun: boolean;

  constructor(options: { dryRun?: boolean } = {}) {
    this.dryRun = options.dryRun ?? false;
  }

  onTestModuleCollected(module: Parameters<NonNullable<Reporter['onTestModuleCollected']>>[0]): void {
    for (const _child of module.children.allTests()) {
      this.total++;
    }
  }

  onTestCaseResult(testCase: Parameters<NonNullable<Reporter['onTestCaseResult']>>[0]): void {
    const result = testCase.result();
    if (result.state === 'passed') {
      this.captured++;
      const label = this.dryRun ? 'matched' : 'captured';
      console.log(`  ${label}: ${testCase.fullName}`);
    } else if (result.state === 'failed') {
      this.failed++;
      console.error(`  failed:   ${testCase.fullName}`);
    }
  }

  onTestRunEnd(): void {
    const label = this.dryRun ? 'matched' : 'captured';
    console.log(
      `\nDone: ${this.captured} ${label}, ${this.failed} failed (${this.total} total)`,
    );
  }
}

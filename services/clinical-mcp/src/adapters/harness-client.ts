// Interim: this file is the stub for the future IPC boundary between Product B
// (this service — the agent-native nursing EHR) and Product A (the Noah RN
// Agent Harness). Do not grow its API surface.
//
// Today it proxies to @noah-rn/agent-harness via a dynamic import of the
// runtime tools entry point. Tomorrow it should switch to a real transport
// (stdio / unix-socket / MCP client) without changing any worker call site.
//
// All cross-product calls from Product B into Product A MUST go through this
// adapter. Direct imports from packages/agent-harness/** elsewhere in this
// service are a boundary violation.

export interface RenderShiftReportArgs {
  patientId: string;
  context: unknown;
  laneCoverage?: Record<string, string>;
}

export interface RenderShiftReportResult {
  markdown: string;
}

type ToolArgsByName = {
  render_shift_report: RenderShiftReportArgs;
};

type ToolResultByName = {
  render_shift_report: RenderShiftReportResult;
};

type HarnessClient = {
  callHarnessTool<T extends keyof ToolArgsByName>(
    tool: T,
    args: ToolArgsByName[T],
  ): Promise<ToolResultByName[T]>;
};

const HARNESS_RENDER_SHIFT_REPORT_PATH =
  '../../../../packages/agent-harness/tools/render-shift-report.mjs';

async function defaultHarnessClient(): Promise<HarnessClient> {
  const mod = (await import(HARNESS_RENDER_SHIFT_REPORT_PATH)) as {
    renderShiftReport: (args: RenderShiftReportArgs) => Promise<RenderShiftReportResult>;
  };

  return {
    async callHarnessTool<T extends keyof ToolArgsByName>(
      tool: T,
      args: ToolArgsByName[T],
    ): Promise<ToolResultByName[T]> {
      if (tool === 'render_shift_report') {
        return (await mod.renderShiftReport(
          args as RenderShiftReportArgs,
        )) as ToolResultByName[T];
      }
      throw new Error(
        `Unsupported harness tool: ${String(tool)}. Interim adapter only proxies render_shift_report.`,
      );
    },
  };
}

let currentClientFactory: () => Promise<HarnessClient> = defaultHarnessClient;

export function __setHarnessClientFactoryForTests(
  factory: () => Promise<HarnessClient>,
): void {
  currentClientFactory = factory;
}

export function __resetHarnessClientFactoryForTests(): void {
  currentClientFactory = defaultHarnessClient;
}

export async function callHarnessTool<T extends keyof ToolArgsByName>(
  tool: T,
  args: ToolArgsByName[T],
): Promise<ToolResultByName[T]> {
  const client = await currentClientFactory();
  return client.callHarnessTool<T>(tool, args);
}

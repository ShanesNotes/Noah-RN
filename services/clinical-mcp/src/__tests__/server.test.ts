import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface RegisteredToolLike {
  description?: string;
  handler: (args: Record<string, unknown>) => Promise<{
    content: Array<{ type: string; text: string }>;
    structuredContent?: Record<string, unknown>;
  }>;
}

interface McpServerWithTools {
  _registeredTools: Record<string, RegisteredToolLike>;
}

describe('MCP server shift report task tool', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock('../worker/shift-report-worker.js');
  });

  it('registers poll_shift_report_tasks and returns worker summary', async () => {
    const pollOnce = vi.fn().mockResolvedValue({
      found: 2,
      completed: 1,
      failed: 1,
      results: [
        {
          taskId: 'task-1',
          status: 'completed',
          documentReferenceId: 'doc-1',
        },
        {
          taskId: 'task-2',
          status: 'failed',
          error: 'context exploded',
        },
      ],
    });
    vi.doMock('../worker/shift-report-worker.js', () => ({ pollOnce }));

    const { createServer } = await import('../server.js');
    const server = createServer() as unknown as McpServerWithTools;
    const tool = server._registeredTools.poll_shift_report_tasks;

    expect(tool).toBeDefined();
    expect(tool.description).toContain('requested shift-report Tasks');

    const result = await tool.handler({ count: 7 });

    expect(pollOnce).toHaveBeenCalledWith(7);
    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          found: 2,
          completed: 1,
          failed: 1,
          results: [
            {
              taskId: 'task-1',
              status: 'completed',
              documentReferenceId: 'doc-1',
            },
            {
              taskId: 'task-2',
              status: 'failed',
              error: 'context exploded',
            },
          ],
        }, null, 2),
      },
    ]);
    expect(result.structuredContent).toEqual({
      found: 2,
      completed: 1,
      failed: 1,
      results: [
        {
          taskId: 'task-1',
          status: 'completed',
          documentReferenceId: 'doc-1',
        },
        {
          taskId: 'task-2',
          status: 'failed',
          error: 'context exploded',
        },
      ],
    });
  });
});

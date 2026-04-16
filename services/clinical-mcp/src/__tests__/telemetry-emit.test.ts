import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildMcpToolTrace,
  emitTrace,
  getCapturedEnvelopes,
  resetTraceSink,
  setTraceSink,
} from '../telemetry/emit.js';

describe('Product B telemetry — TraceEnvelopeV1 emission', () => {
  beforeEach(() => {
    resetTraceSink();
  });

  afterEach(() => {
    resetTraceSink();
  });

  it('builds an ehr-product envelope with the requested tool operation', () => {
    const envelope = buildMcpToolTrace({
      tool: 'get_patient_context',
      parent_trace_id: 'harness-root-trace-1',
      timestamp_start: '2026-04-16T12:00:00.000Z',
      timestamp_end: '2026-04-16T12:00:00.120Z',
      lane_coverage: { 'ehr/chart': 'present' },
    });

    expect(envelope.product).toBe('ehr');
    expect(envelope.tool).toBe('get_patient_context');
    expect(envelope.operation).toBe('mcp-tool:get_patient_context');
    expect(envelope.parent_trace_id).toBe('harness-root-trace-1');
    expect(envelope.trace_id).toMatch(/[0-9a-f-]{36}/);
    expect(envelope.lane_coverage?.['ehr/chart']).toBe('present');
  });

  it('routes emitted envelopes through the configured sink', async () => {
    const sunk: unknown[] = [];
    setTraceSink((env) => {
      sunk.push(env);
    });

    const envelope = buildMcpToolTrace({ tool: 'get_medication_list' });
    await emitTrace(envelope);

    expect(sunk).toEqual([envelope]);
    expect(getCapturedEnvelopes()).toHaveLength(0);
  });

  it('buffers to the default sink when no custom sink is set', async () => {
    const envelope = buildMcpToolTrace({ tool: 'lookup_drug' });
    await emitTrace(envelope);
    expect(getCapturedEnvelopes()).toHaveLength(1);
    expect(getCapturedEnvelopes()[0]?.tool).toBe('lookup_drug');
  });

  it('supports cross-product lineage via parent_trace_id', () => {
    const harnessTraceId = 'harness-five-rights-001';
    const first = buildMcpToolTrace({ tool: 'get_patient_context', parent_trace_id: harnessTraceId });
    const second = buildMcpToolTrace({ tool: 'get_medication_list', parent_trace_id: harnessTraceId });
    const third = buildMcpToolTrace({ tool: 'lookup_drug', parent_trace_id: harnessTraceId });
    const chain = [first, second, third];

    expect(chain.every((t) => t.parent_trace_id === harnessTraceId)).toBe(true);
    expect(new Set(chain.map((t) => t.trace_id)).size).toBe(3);
  });
});

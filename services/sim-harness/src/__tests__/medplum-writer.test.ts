import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMedplumWriter } from "../medplum-writer.js";
import type { FhirTransactionBundle } from "../device-bridge.js";

const TEST_CONFIG = {
  serverUrl: "http://localhost:9999/fhir/R4",
  tokenEndpoint: "http://localhost:9999/oauth2/token",
  clientId: "test-client",
  clientSecret: "test-secret",
  requestTimeoutMs: 5000,
};

const SAMPLE_BUNDLE: FhirTransactionBundle = {
  resourceType: "Bundle",
  type: "transaction",
  entry: [],
};

describe("createMedplumWriter", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns success on 200 response", async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "tok123", expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ resourceType: "Bundle", type: "transaction-response" }),
      }) as any;

    const writer = createMedplumWriter(TEST_CONFIG);
    const result = await writer(SAMPLE_BUNDLE);
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns failure on non-200 response", async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "tok123", expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: async () => "Invalid bundle",
      }) as any;

    const writer = createMedplumWriter(TEST_CONFIG);
    const result = await writer(SAMPLE_BUNDLE);
    expect(result.success).toBe(false);
    expect(result.error).toContain("400");
  });

  it("returns failure on network error", async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "tok123", expires_in: 3600 }),
      })
      .mockRejectedValueOnce(new Error("Connection refused")) as any;

    const writer = createMedplumWriter(TEST_CONFIG);
    const result = await writer(SAMPLE_BUNDLE);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Connection refused");
  });

  it("caches token across calls", async () => {
    const mockFetch = vi.fn()
      // Token request (only once)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "cached-token", expires_in: 3600 }),
      })
      // First bundle POST
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })
      // Second bundle POST (no new token request)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
    globalThis.fetch = mockFetch as any;

    const writer = createMedplumWriter(TEST_CONFIG);
    await writer(SAMPLE_BUNDLE);
    await writer(SAMPLE_BUNDLE);

    // Should have: 1 token request + 2 bundle POSTs = 3 total
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("returns failure on token request error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    }) as any;

    const writer = createMedplumWriter(TEST_CONFIG);
    const result = await writer(SAMPLE_BUNDLE);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Token request failed");
  });
});

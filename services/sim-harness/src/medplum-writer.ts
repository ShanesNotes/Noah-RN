import { simConfig } from "./config.js";
import type { FhirTransactionBundle, WriterResult } from "./device-bridge.js";

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

/**
 * Create a fhirWriter function that posts FHIR transaction Bundles to Medplum.
 *
 * Handles OAuth2 client_credentials token caching. Compatible with
 * DeviceBridge's fhirWriter interface.
 */
export interface MedplumWriterConfig {
  serverUrl: string;
  tokenEndpoint: string;
  clientId: string;
  clientSecret: string;
  requestTimeoutMs: number;
}

export function createMedplumWriter(
  config: MedplumWriterConfig = simConfig.fhir,
): (bundle: FhirTransactionBundle) => Promise<WriterResult> {
  let tokenCache: TokenCache | null = null;

  async function getAccessToken(): Promise<string> {
    if (tokenCache && Date.now() < tokenCache.expiresAt - 30_000) {
      return tokenCache.accessToken;
    }

    const res = await fetch(config.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=client_credentials&client_id=${config.clientId}&client_secret=${config.clientSecret}`,
    });

    if (!res.ok) {
      throw new Error(`Token request failed: ${res.status} ${res.statusText}`);
    }

    const body = (await res.json()) as {
      access_token: string;
      expires_in?: number;
    };
    tokenCache = {
      accessToken: body.access_token,
      expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
    };
    return tokenCache.accessToken;
  }

  return async (bundle: FhirTransactionBundle): Promise<WriterResult> => {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      config.requestTimeoutMs,
    );

    try {
      const token = await getAccessToken();
      const res = await fetch(config.serverUrl, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/fhir+json",
        },
        body: JSON.stringify(bundle),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return {
          success: false,
          error: `FHIR POST ${res.status}: ${res.statusText} — ${text}`,
        };
      }

      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: `FHIR POST failed: ${msg}` };
    } finally {
      clearTimeout(timeout);
    }
  };
}

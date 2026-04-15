/**
 * Sim-harness configuration.
 * Reads from environment variables with sensible defaults matching the local Medplum instance.
 */
export const simConfig = {
  fhir: {
    serverUrl: process.env.FHIR_SERVER ?? "http://10.0.0.184:8103/fhir/R4",
    tokenEndpoint:
      process.env.FHIR_TOKEN_ENDPOINT ??
      "http://10.0.0.184:8103/oauth2/token",
    clientId:
      process.env.FHIR_CLIENT_ID ??
      "3c3c4c3a-2993-424c-b46d-f58db0d7ca14",
    clientSecret:
      process.env.FHIR_CLIENT_SECRET ??
      "be4fd047142ee6ed2a004a4a9cb98ff4c20f7c73d6082b3754dc9ae613083a34",
    requestTimeoutMs: 10_000,
  },
  writeCadenceSeconds: Number(process.env.SIM_WRITE_CADENCE_SECONDS) || 60,
} as const;

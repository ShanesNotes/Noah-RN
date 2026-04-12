#!/usr/bin/env node
import { assemblePatientContext } from "./dist/context/assembler.js";

async function main() {
  const patientId = process.argv[2];
  if (!patientId) {
    process.stderr.write("Usage: get-context <patient_id>\n");
    process.exit(1);
  }

  const context = await assemblePatientContext(patientId);
  process.stdout.write(JSON.stringify(context));
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(2);
});

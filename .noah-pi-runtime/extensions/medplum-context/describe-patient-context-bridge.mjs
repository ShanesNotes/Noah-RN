export function describePatientContextBridge() {
  return {
    bridge: "patient-context",
    status: "scaffold-bridge",
    authoritative_service: "services/clinical-mcp/",
    primary_tool: "get_patient_context",
    future_extension_surface: ".pi/extensions/medplum-context/",
    first_workflow_target: "shift-report",
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(describePatientContextBridge(), null, 2));
}

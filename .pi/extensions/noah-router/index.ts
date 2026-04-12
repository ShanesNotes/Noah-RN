/**
 * noah-router extension scaffold
 *
 * This is intentionally non-functional.
 * It exists to give future pi-native implementation work a concrete entrypoint.
 */

export interface NoahRouterExtensionContext {
  sourceOfTruth: string;
  firstWorkflow: string;
  status: "scaffold";
}

export function describeNoahRouterExtension(): NoahRouterExtensionContext {
  return {
    sourceOfTruth: "packages/agent-harness/router/clinical-router.md",
    firstWorkflow: "shift-report",
    status: "scaffold",
  };
}

export default function noahRouterExtension() {
  return describeNoahRouterExtension();
}

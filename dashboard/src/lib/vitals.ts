export const VITAL_CODES = ['8867-4', '55284-4', '9279-1', '2708-6', '8310-5'] as const;
export const VITAL_CODES_SET = new Set<string>(VITAL_CODES);
export const VITAL_CODES_STRING = VITAL_CODES.join(',');

export const BP_CODE = '55284-4';
export const BP_SYSTOLIC_CODE = '8480-6';
export const BP_DIASTOLIC_CODE = '8462-4';

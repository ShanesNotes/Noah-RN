import { MedplumClient } from '@medplum/core';

export const medplum = new MedplumClient({
  baseUrl: 'http://10.0.0.184:8080/',
  fhirUrlPath: 'fhir',
});

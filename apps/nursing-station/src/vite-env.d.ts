/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MEDPLUM_BASE_URL?: string;
  readonly VITE_MEDPLUM_AUTO_LOGIN?: string;
  readonly VITE_MEDPLUM_CLIENT_ID?: string;
  readonly VITE_MEDPLUM_CLIENT_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

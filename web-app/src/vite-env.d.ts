/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** backend-core, e.g. https://api.trakio.app (defaults to http://localhost:8080). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

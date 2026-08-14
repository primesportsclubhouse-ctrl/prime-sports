import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Supabase CLI's local-dev runtime cache — already gitignored (see
    // supabase/.gitignore), but flat-config ESLint doesn't read .gitignore
    // on its own, so it was still being linted as vendored/generated code
    // (a bundled Edge Runtime entrypoint) unrelated to anything in this repo.
    "supabase/.temp/**",
  ]),
]);

export default eslintConfig;

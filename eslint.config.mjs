import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".next-dev/**",
      "artifacts/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "public/mediapipe/**",
      "frontend/node_modules/**",
      "frontend/dist/**",
    ],
  },
  {
    // Camera data URLs are local photos and must not go through an image proxy.
    rules: { "@next/next/no-img-element": "off" },
  },
];

export default eslintConfig;

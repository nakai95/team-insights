import { describe, expect, it } from "vitest";
import { shouldExcludeFile } from "../fileExclusion";

describe("shouldExcludeFile", () => {
  describe("should exclude specified files", () => {
    it.each([
      // Lock files
      ["package-lock.json", "package-lock.json"],
      ["yarn.lock", "yarn.lock"],
      ["pnpm-lock.yaml", "pnpm-lock.yaml"],
      ["Gemfile.lock", "Gemfile.lock"],
      ["Cargo.lock", "Cargo.lock"],
      ["poetry.lock", "poetry.lock"],
      ["composer.lock", "composer.lock"],

      // Build artifacts and dist directories
      ["dist directory files", "dist/bundle.js"],
      ["dist HTML files", "dist/index.html"],
      ["build directory files", "build/main.js"],
      ["out directory files", "out/compiled.js"],
      [".next directory files", ".next/server.js"],
      ["target directory files", "target/release/app"],
      ["bin directory files", "bin/executable"],
      ["obj directory files", "obj/Debug/app.o"],

      // Dependencies
      ["node_modules files", "node_modules/react/index.js"],
      ["nested node_modules", "node_modules/some-package/dist/bundle.js"],
      ["vendor files", "vendor/autoload.php"],
      [".venv files", ".venv/lib/python3.9/site-packages/module.py"],

      // Generated documentation
      ["docs/api files", "docs/api/index.html"],
      ["coverage files", "coverage/lcov-report/index.html"],

      // Minified files
      ["minified JS", "bundle.min.js"],
      ["minified JS with path", "app.min.js"],
      ["minified CSS", "styles.min.css"],
      ["minified CSS with path", "main.min.css"],

      // Source maps
      ["JS source maps", "bundle.js.map"],
      ["CSS source maps", "styles.css.map"],
      ["minified source maps", "app.min.js.map"],
    ])("%s: %s", (_description, filename) => {
      expect(shouldExcludeFile(filename)).toBe(true);
    });
  });

  describe("should not exclude regular source files", () => {
    it.each([
      ["TypeScript files", "src/index.ts"],
      ["TSX files", "src/components/Button.tsx"],
      ["JavaScript files", "src/utils/helper.js"],
      ["webpack config", "config/webpack.config.js"],
      ["CSS files", "src/styles/main.css"],
      ["README", "README.md"],
      ["documentation", "docs/guide.md"],
      ["package.json", "package.json"],
      ["tsconfig.json", "tsconfig.json"],
      ["ESLint config", ".eslintrc.js"],
    ])("%s: %s", (_description, filename) => {
      expect(shouldExcludeFile(filename)).toBe(false);
    });
  });
});

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith(".ts") ? [path] : [];
  });
}

function importsOf(file: string): string[] {
  return [...readFileSync(file, "utf8").matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]!);
}

describe("layer boundaries", () => {
  it("domain and application code never import Fastify, MongoDB or the outer layers", () => {
    const forbidden = /^(fastify|@fastify\/|mongodb|bcryptjs)|infrastructure\/|\/http\//;
    for (const layer of ["src/domain", "src/application"]) {
      for (const file of sourceFiles(layer)) {
        for (const spec of importsOf(file)) {
          expect(spec, `${file} imports ${spec}`).not.toMatch(forbidden);
        }
      }
    }
  });

  it("the domain imports nothing from the application layer", () => {
    for (const file of sourceFiles("src/domain")) {
      for (const spec of importsOf(file)) {
        expect(spec, `${file} imports ${spec}`).not.toMatch(/application\//);
      }
    }
  });
});

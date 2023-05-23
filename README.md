# esbuild-plugin-rewrite

**TODO**

This plugin rewrites external dependencies.

## Example

Rewrite all imports to esm.sh:

```ts
import esbuild from "esbuild";
import { readJson } from "fs-extra";
import { createRewriteImportsPlugin } from "./plugin";

const lockfile = await readJson("../../package-lock.json");

const rewriteToESMPlugin = createRewriteImportsPlugin({
  rewriteCallback: (c) => {
    const { scope, name, subpath } = c;
    const fullname = scope ? `${scope}/${name}` : name;
    const resolution = lockfile.packages[`node_modules/${fullname}`];

    return {
      action: "rewrite",
      path: `https://esm.sh/${fullname}@${resolution.version}${subpath ?? ""}`,
    };
  },
});

const ctx = await esbuild.context({
  entryPoints: ["src/index.tsx"],
  bundle: true,
  outdir: "public/js",
  format: "esm",
  plugins: [rewriteToESMPlugin],
});

const { host, port } = await ctx.serve({ servedir: "./public" });

console.log(`Serving on http://${host}:${port}`);
```

## Actions supported:

- `rewrite` -> rewrite the argument of the `import`, `@import` or `require` statement found in the code
- `replace` -> replace the whole statement with the given content
- `ignore` -> leave it in the code; the dependency is bundled
- `remove` -> remove the statement from the code and leave a placeholder comment

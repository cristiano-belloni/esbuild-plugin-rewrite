import esbuild from "esbuild";

type RewriteResult =
  | {
      action: "rewrite";
      path: string;
    }
  | {
      action: "replace";
      content: string;
    }
  | {
      action: "ignore";
    }
  | {
      action: "remove";
    };

interface ImportComponents {
  kind: esbuild.ImportKind;
  scope?: string;
  name?: string;
  subpath?: string;
  fullPath: string;
}

interface Options {
  rewriteCallback: (c: ImportComponents) => RewriteResult;
  filter?: RegExp;
}

const packagePathRegex = /^(@[^/]+\/)?([^/@]+)(\/.+)?$/;

export function createRewriteImportsPlugin({
  rewriteCallback: rewrite,
  filter = /^[a-z0-9-~]|@/,
}: Options): esbuild.Plugin {
  const rewriteImportsPlugin: esbuild.Plugin = {
    name: "rewrite-imports",
    setup(build) {
      // Filter on external dependencies
      build.onResolve({ filter, namespace: "file" }, (args) => {
        const regexResult = packagePathRegex.exec(args.path);
        const result = rewrite({
          scope: regexResult?.[1],
          name: regexResult?.[2],
          subpath: regexResult?.[3],
          fullPath: args.path,
          kind: args.kind,
        });

        // - rewrite -> return a new path to rewrite the import argument to
        // - replace -> replace the import with the given content
        // - ignore -> don't rewrite; the dependency is bundled
        // - remove -> remove the import from code and leave a placeholder comment

        switch (result.action) {
          case "replace":
            return {
              path: args.path,
              namespace: "rewritable-replace",
              pluginData: { content: result.content },
            };
          case "rewrite":
            return {
              path: result.path,
              external: true,
            };
          case "remove":
            return {
              path: args.path,
              namespace: "rewritable-remove",
            };
          case "ignore":
            return {};
          default:
            throw new Error(
              `Invalid data passed to the rewrite-imports plugin:\n${JSON.stringify(
                result,
                null,
                2
              )}`
            );
        }
      });
      build.onLoad({ filter, namespace: "rewritable-remove" }, (args) => ({
        contents: `/* Import of ${args.path} was removed by the rewrite-imports plugin */`,
      }));

      build.onLoad({ filter, namespace: "rewritable-replace" }, (args) => ({
        contents: args.pluginData.content,
      }));

      build.onEnd((result) => {
        console.log(`build ended with ${result.errors.length} errors`);
      });
    },
  };
  return rewriteImportsPlugin;
}

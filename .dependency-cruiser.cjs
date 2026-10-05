/** Package boundaries (D-039): domain logic stays pure; apps depend on packages, never the reverse. */
const domain = "^packages/(contracts|compare|imaging|materials|coaching|projects)/";

module.exports = {
  forbidden: [
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
    {
      name: "packages-not-to-apps",
      comment: "Packages are reusable; they never import an app.",
      severity: "error",
      from: { path: "^packages/" },
      to: { path: "^apps/" },
    },
    {
      name: "domain-without-ui",
      comment: "Framework-independent logic stays outside React and the UI package.",
      severity: "error",
      from: { path: domain },
      to: { path: ["^packages/ui/", "node_modules/(react|react-dom|@radix-ui)/"] },
    },
    {
      name: "contracts-are-the-root",
      comment: "Contracts depend on no other workspace package.",
      severity: "error",
      from: { path: "^packages/contracts/" },
      to: { path: "^packages/(?!contracts/)" },
    },
    {
      name: "no-unresolvable",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(dist|coverage)/" },
    tsPreCompilationDeps: true,
    combinedDependencies: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "default"],
      extensions: [".ts", ".tsx", ".js"],
    },
  },
};

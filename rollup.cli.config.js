import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

export default {
  input: "src/cli.js",
  output: {
    file: "cli.mjs",
    format: "esm",
    banner: "#!/usr/bin/env node",
  },
  plugins: [nodeResolve(), commonjs()],
};

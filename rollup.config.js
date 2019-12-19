import resolve from "rollup-plugin-node-resolve";

import babel from "rollup-plugin-babel";

import commonjs from "rollup-plugin-commonjs";

import pkg from "./package.json";
export default [
  {
    input: "src/main.js",
    output: {
      name: "vuex-observable",
      file: pkg.browser,
      format: "umd"
    },
    plugins: [
      resolve(),
      commonjs(),
      babel({
        exclude: ["node_modules/**"]
      })
    ]
  },

  {
    input: "src/main.js",
    output: [
      {
        file: pkg.main,
        format: "cjs"
      },
      {
        file: pkg.module,
        format: "es"
      }
    ],
    plugins: [
      babel({
        exclude: ["node_modules/**"]
      })
    ],
    external: ["rxjs", "vuex"]
  }
];

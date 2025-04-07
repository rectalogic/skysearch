import { viteStaticCopy } from "vite-plugin-static-copy";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2022",
  },
  worker: {
    format: "es",
  },
  plugins: [
    tailwindcss(),
    viteStaticCopy({
      targets: [
        {
          src: "node_modules/@mediapipe/tasks-text/wasm/*",
          dest: "wasm",
        },
      ],
    }),
  ],
});

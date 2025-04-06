import { FilesetResolver, TextEmbedder } from "@mediapipe/tasks-text";

export default async function createEmbedder() {
  const textFiles = await FilesetResolver.forTextTasks(
    "/wasm",
  );
  // TextEmbedder.createFromOptions uses importScripts which is not legal in a module webworker,
  // so we directly fetch and eval wasmLoaderPath ourselves
  // https://github.com/google-ai-edge/mediapipe/issues/5257
  const response = await fetch(textFiles.wasmLoaderPath);
  // This sets globalThis.ModuleFactory used by TextEmbedder.createFromOptions
  eval?.(await response.text());
  // @ts-expect-error: Manually loaded wasmLoaderPath
  delete textFiles.wasmLoaderPath;
  return await TextEmbedder.createFromOptions(textFiles, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/text_embedder/universal_sentence_encoder/float32/1/universal_sentence_encoder.tflite",
      // delegate: "GPU",
    },
  });
}

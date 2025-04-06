/// <reference lib="webworker" />

import {
  FilesetResolver,
  TextEmbedder,
  TextEmbedderResult,
} from "@mediapipe/tasks-text";

async function createEmbedder() {
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

const textEmbedder = await createEmbedder();

let queryEmbedding: TextEmbedderResult;
let jetstreamWorker: Worker;

// Handle new queries. The first query triggers initializing jetstream
self.onmessage = (event) => {
  queryEmbedding = textEmbedder.embed(event.data.query);
  if (!jetstreamWorker) {
    jetstreamWorker = new Worker(
      new URL("jetstream-worker.js", import.meta.url).href,
      { type: "module", name: "jetstream-worker" },
    );
    jetstreamWorker.onmessage = jetstreamMessageHandler;
  }
};

let messageCount = 0;

const jetstreamMessageHandler = (event: MessageEvent) => {
  messageCount += 1;
  if (messageCount % 100 === 0) {
    console.log(`embedding ${messageCount}`);
  }
  const embedding = textEmbedder.embed(event.data.commit.record.text);
  if (
    !(
      embedding.embeddings && embedding.embeddings[0] &&
      queryEmbedding.embeddings && queryEmbedding.embeddings[0]
    )
  ) {
    return;
  }
  const similarity = TextEmbedder.cosineSimilarity(
    embedding.embeddings[0],
    queryEmbedding.embeddings[0],
  );
  if (similarity >= 0.8) {
    self.postMessage(event.data);
  }
};

self.postMessage("ready");

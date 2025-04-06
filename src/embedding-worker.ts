/// <reference lib="webworker" />

import { TextEmbedder, TextEmbedderResult } from "@mediapipe/tasks-text";
import createEmbedder from "./embedder.ts";

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

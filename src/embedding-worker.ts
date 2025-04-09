/// <reference lib="webworker" />

import { TextEmbedder, TextEmbedderResult } from "@mediapipe/tasks-text";
import createEmbedder from "./embedder.ts";
import { QueryMessage, SimilarityMessage, TextMessage } from "./messages.ts";

declare global {
  interface WorkerGlobalScope {
    postMessage(
      this: DedicatedWorkerGlobalScope,
      message: SimilarityMessage,
      transfer?: Transferable[],
    ): void;
    onmessage:
      | ((
        this: DedicatedWorkerGlobalScope,
        ev: MessageEvent<
          | QueryMessage
          | TextMessage
        >,
      ) => void)
      | null;
  }
}

const textEmbedder = await createEmbedder();

let queryEmbedding: TextEmbedderResult;

self.onmessage = (
  event: MessageEvent<
    | QueryMessage
    | TextMessage
  >,
) => {
  switch (event.data.type) {
    case "query": {
      queryEmbedding = event.data.query;
      break;
    }
    case "text": {
      if (!queryEmbedding) {
        self.postMessage({ type: "similarity", similarity: -1 });
        return;
      }
      const embedding = textEmbedder.embed(
        event.data.text,
      );
      if (
        !(
          embedding.embeddings && embedding.embeddings[0] &&
          queryEmbedding.embeddings && queryEmbedding.embeddings[0]
        )
      ) {
        self.postMessage({ type: "similarity", similarity: -1 });
        return;
      }
      const similarity = TextEmbedder.cosineSimilarity(
        embedding.embeddings[0],
        queryEmbedding.embeddings[0],
      );
      self.postMessage({
        type: "similarity",
        similarity: similarity,
      });
    }
  }
};

self.postMessage({ type: "similarity", similarity: -1 });

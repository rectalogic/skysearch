/// <reference lib="webworker" />

import { TextEmbedder, TextEmbedderResult } from "@mediapipe/tasks-text";
import createEmbedder from "./embedder.ts";
import {
  AvailableMessage,
  QueryMessage,
  SimilarityMessage,
  TextMessage,
} from "./messages.ts";

declare global {
  interface WorkerGlobalScope {
    postMessage(
      this: DedicatedWorkerGlobalScope,
      message: AvailableMessage,
      transfer?: Transferable[],
    ): void;
    onmessage:
      | ((
        this: DedicatedWorkerGlobalScope,
        ev: MessageEvent<
          | QueryMessage
          | TextMessage
          | SimilarityMessage
        >,
      ) => void)
      | null;
  }
}

const textEmbedder = await createEmbedder();

let queryEmbedding: TextEmbedderResult;
let querySimilarity = 0;

self.onmessage = (
  event: MessageEvent<
    | QueryMessage
    | TextMessage
    | SimilarityMessage
  >,
) => {
  switch (event.data.type) {
    case "query": {
      queryEmbedding = event.data.query;
      break;
    }
    case "similarity": {
      querySimilarity = event.data.similarity;
      break;
    }
    case "text": {
      if (!queryEmbedding) {
        self.postMessage({ type: "available", postMatched: false });
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
        self.postMessage({ type: "available", postMatched: false });
        return;
      }
      const similarity = TextEmbedder.cosineSimilarity(
        embedding.embeddings[0],
        queryEmbedding.embeddings[0],
      );
      self.postMessage({
        type: "available",
        postMatched: similarity >= querySimilarity,
      });
    }
  }
};

self.postMessage({ type: "available", postMatched: false });

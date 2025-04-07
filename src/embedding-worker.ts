/// <reference lib="webworker" />

import { TextEmbedder, TextEmbedderResult } from "@mediapipe/tasks-text";
import createEmbedder from "./embedder.ts";
import { PostMessage, QueryMessage, SimilarityMessage } from "./messages.ts";

const textEmbedder = await createEmbedder();

let queryEmbedding: TextEmbedderResult;
let querySimilarity = 0.8;

self.onmessage = (
  event: MessageEvent<
    | QueryMessage
    | PostMessage
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
    case "post": {
      if (!queryEmbedding) {
        self.postMessage({ type: "available", postMatched: false });
        return;
      }
      const embedding = textEmbedder.embed(
        event.data.post.text,
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

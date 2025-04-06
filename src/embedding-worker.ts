/// <reference lib="webworker" />

import { TextEmbedder, TextEmbedderResult } from "@mediapipe/tasks-text";
import createEmbedder from "./embedder.ts";
import { QueryMessage, RecordMessage, SimilarityMessage } from "./messages.ts";

const textEmbedder = await createEmbedder();

let queryEmbedding: TextEmbedderResult;
let querySimilarity = 0.8;

self.onmessage = (
  event: MessageEvent<
    | QueryMessage
    | RecordMessage
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
    case "record": {
      if (!queryEmbedding) {
        self.postMessage({ type: "available", recordMatched: false });
        return;
      }
      const embedding = textEmbedder.embed(
        event.data.record.commit.record.text,
      );
      if (
        !(
          embedding.embeddings && embedding.embeddings[0] &&
          queryEmbedding.embeddings && queryEmbedding.embeddings[0]
        )
      ) {
        self.postMessage({ type: "available", recordMatched: false });
        return;
      }
      const similarity = TextEmbedder.cosineSimilarity(
        embedding.embeddings[0],
        queryEmbedding.embeddings[0],
      );
      self.postMessage({
        type: "available",
        recordMatched: similarity >= querySimilarity,
      });
    }
  }
};

self.postMessage({ type: "available", recordMatched: false });

import { TextEmbedderResult } from "@mediapipe/tasks-text";

export interface BaseMessage {
  type: "query" | "similarity" | "text";
}

export interface QueryMessage extends BaseMessage {
  type: "query";
  query: TextEmbedderResult;
}

export interface TextMessage extends BaseMessage {
  type: "text";
  text: string;
}

export interface SimilarityMessage extends BaseMessage {
  type: "similarity";
  similarity: number;
}

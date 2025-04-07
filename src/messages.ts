import { TextEmbedderResult } from "@mediapipe/tasks-text";

export interface BaseMessage {
  type: "query" | "similarity" | "text" | "available";
}

export interface QueryMessage extends BaseMessage {
  type: "query";
  query: TextEmbedderResult;
}

export interface SimilarityMessage extends BaseMessage {
  type: "similarity";
  similarity: number;
}

export interface TextMessage extends BaseMessage {
  type: "text";
  text: string;
}

export interface AvailableMessage extends BaseMessage {
  type: "available";
  postMatched: boolean;
}

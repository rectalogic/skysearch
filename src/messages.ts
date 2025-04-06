import { TextEmbedderResult } from "@mediapipe/tasks-text";
import { CommitCreateEvent } from "./jetstream.ts";

export type MessageHandler = ((data: CommitCreateEvent) => void) | null;

export interface BaseMessage {
  type: "query" | "similarity" | "record" | "available";
}

export interface QueryMessage extends BaseMessage {
  type: "query";
  query: TextEmbedderResult;
}

export interface SimilarityMessage extends BaseMessage {
  type: "similarity";
  similarity: number;
}

export interface RecordMessage extends BaseMessage {
  type: "record";
  record: CommitCreateEvent;
}

export interface AvailableMessage extends BaseMessage {
  type: "available";
  recordMatched: boolean;
}

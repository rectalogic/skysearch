import { AppBskyFeedPost } from "@atproto/api";
import { TextEmbedderResult } from "@mediapipe/tasks-text";

export type PostHandler = ((post: AppBskyFeedPost.Record) => void) | null;

export interface BaseMessage {
  type: "query" | "similarity" | "post" | "text" | "available";
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

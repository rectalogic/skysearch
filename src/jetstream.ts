import { AppBskyFeedPost, Did } from "@atproto/api";
import { PostHandler } from "./messages.ts";

export interface CommitCreateEvent {
  did: Did;
  time_us: number;
  kind: "commit";
  commit: {
    operation: "create";
    record: AppBskyFeedPost.Record;
  };
}

export type ErrorHandler = ((event: Event) => void) | null;

export default class Jetstream {
  #ws: WebSocket;
  #onmessage: PostHandler = null;
  #onerror: ErrorHandler = null;

  constructor() {
    this.#ws = new WebSocket(
      "wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post",
    );

    this.#ws.onmessage = (event) => {
      if (this.#onmessage) {
        const data = JSON.parse(event.data);
        if (
          data.kind === "commit" && data.commit.operation === "create" &&
          AppBskyFeedPost.isRecord(data.commit.record) &&
          AppBskyFeedPost.validateRecord(data.commit.record).success
        ) {
          this.#onmessage(data.commit.record);
        }
      }
    };

    this.#ws.onerror = (event) => {
      if (this.#onerror) {
        this.#onerror(event);
      }
    };
  }

  set onmessage(handler: PostHandler) {
    this.#onmessage = handler;
  }

  set onerror(handler: ErrorHandler) {
    this.#onerror = handler;
  }
}

import { AppBskyFeedPost, Did } from "@atproto/api";

export interface CommitCreateEvent {
  did: Did;
  time_us: number;
  kind: "commit";
  commit: {
    rev: string;
    operation: "create";
    collection: "app.bsky.feed.post";
    rkey: string;
    record: AppBskyFeedPost.Record;
    cid: string;
  };
}

export type CommitCreateHandler = ((event: CommitCreateEvent) => void) | null;
export type ErrorHandler = ((event: Event) => void) | null;

export default class Jetstream {
  #ws: WebSocket;
  #onmessage: CommitCreateHandler = null;
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
          data.commit.record.text.length >= 20 &&
          data.commit.record.langs &&
          data.commit.record.langs.includes("en")
        ) {
          this.#onmessage(data);
        }
      }
    };

    this.#ws.onerror = (event) => {
      if (this.#onerror) {
        this.#onerror(event);
      }
    };
  }

  set onmessage(handler: CommitCreateHandler) {
    this.#onmessage = handler;
  }

  set onerror(handler: ErrorHandler) {
    this.#onerror = handler;
  }
}

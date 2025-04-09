import { AppBskyFeedPost, Did } from "@atproto/api";

interface CommitCreateEvent {
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

export interface BlueskyPost {
  uri: string;
  cid: string;
  text: string;
}
export type BlueskyPostHandler = ((event: BlueskyPost) => void) | null;
export type ErrorHandler = ((event: Event) => void) | null;

function isCommitCreateEvent(event: unknown): event is CommitCreateEvent {
  if (
    typeof event === "object" &&
    event !== null &&
    "kind" in event &&
    event.kind === "commit" &&
    "commit" in event &&
    typeof event.commit === "object" &&
    event.commit !== null &&
    "operation" in event.commit &&
    event.commit.operation === "create" &&
    "record" in event.commit
  ) {
    return AppBskyFeedPost.isRecord(event.commit?.record);
  } else {
    return false;
  }
}

export default class Jetstream {
  #ws: WebSocket | null = null;
  #onmessage: BlueskyPostHandler = null;
  #onerror: ErrorHandler = null;

  startStream() {
    if (this.#ws) {
      return;
    }
    this.#ws = new WebSocket(
      "wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post",
    );
    this.#ws.onmessage = this.handleMessage.bind(this);
    this.#ws.onerror = this.handleError.bind(this);
  }

  stopStream() {
    if (this.#ws) {
      this.#ws.close();
      this.#ws = null;
    }
  }

  private handleMessage(event: MessageEvent<string>) {
    if (this.#onmessage) {
      const data = JSON.parse(event.data);
      if (
        isCommitCreateEvent(data) &&
        data.commit.record.text.length >= 20 &&
        data.commit.record.langs?.includes("en")
      ) {
        this.#onmessage({
          uri: `at://${data.did}/app.bsky.feed.post/${data.commit.rkey}`,
          cid: data.commit.cid,
          text: data.commit.record.text,
        });
      }
    }
  }

  private handleError(event: Event) {
    if (this.#onerror) {
      this.#onerror(event);
    }
  }

  set onmessage(handler: BlueskyPostHandler) {
    this.#onmessage = handler;
  }

  set onerror(handler: ErrorHandler) {
    this.#onerror = handler;
  }
}

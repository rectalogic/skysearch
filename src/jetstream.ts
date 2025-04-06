export interface CommitCreateEvent {
  // did: At.DID;
  time_us: number;
  kind: "commit";
  commit: {
    operation: "create";
    record: {
      text: string;
    };
  };
}
export type MessageHandler = ((data: CommitCreateEvent) => void) | null;
export type ErrorHandler = ((event: Event) => void) | null;

export default class Jetstream {
  #ws: WebSocket;
  #messageCount = 0;
  #onmessage: MessageHandler = null;
  #onerror: ErrorHandler = null;

  constructor() {
    this.#ws = new WebSocket(
      "wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post",
    );

    this.#ws.onmessage = (event) => {
      this.#messageCount += 1;
      if (this.#onmessage) {
        const data = JSON.parse(event.data);
        if (data.kind === "commit" && data.commit.operation === "create") {
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

  set onmessage(handler: MessageHandler) {
    this.#onmessage = handler;
  }

  set onerror(handler: ErrorHandler) {
    this.#onerror = handler;
  }

  get messageCount() {
    return this.#messageCount;
  }
}

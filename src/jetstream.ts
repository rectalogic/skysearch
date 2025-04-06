import { MessageHandler } from "./messages.ts";

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

export type ErrorHandler = ((event: Event) => void) | null;

export default class Jetstream {
  #ws: WebSocket;
  #onmessage: MessageHandler = null;
  #onerror: ErrorHandler = null;

  constructor() {
    this.#ws = new WebSocket(
      "wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post",
    );

    this.#ws.onmessage = (event) => {
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
}

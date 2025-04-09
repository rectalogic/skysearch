/// <reference lib="dom" />

import { TextEmbedderResult } from "@mediapipe/tasks-text";
import { QueryMessage, SimilarityMessage, TextMessage } from "./messages.ts";
import { BlueskyPost, BlueskyPostHandler } from "./jetstream.ts";

export type ErrorHandler = (event: ErrorEvent) => void;

export default class EmbeddingManager {
  #workers: EmbeddingWorker[] = [];
  #eventQueue: BlueskyPost[] = [];
  #onmessage: BlueskyPostHandler | null = null;
  #onerror: ErrorHandler | null = null;
  #query: TextEmbedderResult | null = null;
  #similarity = 0.8;

  constructor() {
    for (let i = 0; i < navigator.hardwareConcurrency; i++) {
      const worker = new EmbeddingWorker(this, i);
      worker.onmessage = (event) => {
        if (event) {
          if (this.#onmessage) {
            this.#onmessage(event);
          }
        }
        // This worker is now free, send it any backlog
        if (this.#eventQueue.length > 0) {
          const post = this.#eventQueue.shift();
          if (post) {
            worker.event = post;
          }
        }
      };
      worker.onerror = (event) => {
        if (this.#onerror) {
          this.#onerror(event);
        }
      };
      this.#workers.push(worker);
    }
  }

  set onmessage(handler: BlueskyPostHandler) {
    this.#onmessage = handler;
  }

  set onerror(handler: ErrorHandler) {
    this.#onerror = handler;
  }

  get messageBacklog() {
    return this.#eventQueue.length;
  }

  purgeBacklog() {
    this.#eventQueue = [];
  }

  set query(query: TextEmbedderResult) {
    this.purgeBacklog();
    this.#query = query;
    for (const worker of this.#workers) {
      worker.query = query;
    }
  }
  get query(): TextEmbedderResult | null {
    return this.#query;
  }

  set similarity(similarity: number) {
    this.#similarity = similarity;
  }
  get similarity(): number {
    return this.#similarity;
  }

  addJetstreamCommit(event: BlueskyPost) {
    for (const worker of this.#workers) {
      if (worker.available) {
        worker.event = event;
        return;
      }
    }
    this.#eventQueue.push(event);
  }
}

interface IEmbeddingWorker extends Omit<Worker, "postMessage"> {
  postMessage(message: QueryMessage | TextMessage): void;
}
export type WorkerBlueskyPostHandler =
  | ((event: BlueskyPost | null) => void)
  | null;

class EmbeddingWorker {
  #id: number;
  #manager: EmbeddingManager;
  #worker: IEmbeddingWorker;
  #available = false;
  #initialized = false;
  #event: BlueskyPost | null = null;
  #onmessage: WorkerBlueskyPostHandler = null;
  #onerror: ErrorHandler | null = null;

  constructor(manager: EmbeddingManager, id: number) {
    this.#manager = manager;
    this.#id = id;
    this.#worker = new Worker(
      new URL("embedding-worker.js", import.meta.url).href,
      { type: "module", name: `embedding-worker-${id}` },
    ) as IEmbeddingWorker;
    this.#worker.onmessage = (event: MessageEvent<SimilarityMessage>) => {
      if (!this.#initialized) {
        this.#initialized = true;
        if (this.#manager.query !== null) {
          this.query = this.#manager.query;
        }
      }
      const post = this.#event;
      this.#event = null;
      this.#available = true;
      if (this.#onmessage) {
        this.#onmessage(
          event.data.similarity >= this.#manager.similarity ? post : null,
        );
      }
    };
    this.#worker.onerror = (event) => {
      if (this.#onerror) {
        this.#onerror(event);
      }
    };
  }

  get available() {
    return this.#available;
  }

  set onmessage(handler: WorkerBlueskyPostHandler) {
    this.#onmessage = handler;
  }

  set onerror(handler: ErrorHandler) {
    this.#onerror = handler;
  }

  set query(query: TextEmbedderResult) {
    if (this.#initialized) {
      this.#worker.postMessage({ type: "query", query: query });
    }
  }

  set event(event: BlueskyPost) {
    if (this.#initialized) {
      this.#event = event;
      this.#available = false;
      this.#worker.postMessage({
        type: "text",
        text: event.text,
      });
    }
  }
}

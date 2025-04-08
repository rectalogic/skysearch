/// <reference lib="dom" />

import { TextEmbedderResult } from "@mediapipe/tasks-text";
import {
  AvailableMessage,
  QueryMessage,
  SimilarityMessage,
  TextMessage,
} from "./messages.ts";
import { CommitCreateEvent, CommitCreateHandler } from "./jetstream.ts";

export type ErrorHandler = (event: ErrorEvent) => void;

export default class EmbeddingManager {
  #workers: EmbeddingWorker[] = [];
  #eventQueue: CommitCreateEvent[] = [];
  #onmessage: CommitCreateHandler | null = null;
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

  set onmessage(handler: CommitCreateHandler) {
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
    for (const worker of this.#workers) {
      worker.similarity = similarity;
    }
  }
  get similarity(): number {
    return this.#similarity;
  }

  addJetstreamCommit(event: CommitCreateEvent) {
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
  postMessage(message: QueryMessage | SimilarityMessage | TextMessage): void;
}
export type WorkerCommitCreateHandler =
  | ((event: CommitCreateEvent | null) => void)
  | null;

class EmbeddingWorker {
  #id: number;
  #manager: EmbeddingManager;
  #worker: IEmbeddingWorker;
  #available = false;
  #initialized = false;
  #event: CommitCreateEvent | null = null;
  #onmessage: WorkerCommitCreateHandler = null;
  #onerror: ErrorHandler | null = null;

  constructor(manager: EmbeddingManager, id: number) {
    this.#manager = manager;
    this.#id = id;
    this.#worker = new Worker(
      new URL("embedding-worker.js", import.meta.url).href,
      { type: "module", name: `embedding-worker-${id}` },
    ) as IEmbeddingWorker;
    this.#worker.onmessage = (event: MessageEvent<AvailableMessage>) => {
      if (!this.#initialized) {
        this.#initialized = true;
        if (this.#manager.query !== null) {
          this.query = this.#manager.query;
        }
        this.similarity = this.#manager.similarity;
      }
      const post = this.#event;
      this.#event = null;
      this.#available = true;
      if (this.#onmessage) {
        this.#onmessage(event.data.postMatched ? post : null);
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

  set onmessage(handler: WorkerCommitCreateHandler) {
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

  set similarity(similarity: number) {
    if (this.#initialized) {
      this.#worker.postMessage({ type: "similarity", similarity: similarity });
    }
  }

  set event(event: CommitCreateEvent) {
    if (this.#initialized) {
      this.#event = event;
      this.#available = false;
      this.#worker.postMessage({
        type: "text",
        text: event.commit.record.text,
      });
    }
  }
}

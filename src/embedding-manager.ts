/// <reference lib="dom" />
import { TextEmbedderResult } from "@mediapipe/tasks-text";
import {
  AvailableMessage,
  MessageHandler,
  QueryMessage,
  RecordMessage,
  SimilarityMessage,
} from "./messages.ts";
import { CommitCreateEvent } from "./jetstream.ts";

export default class EmbeddingManager {
  #workers: EmbeddingWorker[] = [];
  #recordQueue: CommitCreateEvent[] = [];
  #onmessage: MessageHandler | null = null;
  #query: TextEmbedderResult | null = null;
  #similarity: number | null = null;

  constructor() {
    for (let i = 0; i < navigator.hardwareConcurrency; i++) {
      const worker = new EmbeddingWorker(this, i);
      worker.onmessage = (record) => {
        if (record) {
          if (this.#onmessage) {
            this.#onmessage(record);
          }
        }
        // This worker is now free, send it any backlog
        if (this.#recordQueue.length > 0) {
          const record = this.#recordQueue.shift();
          if (record) {
            worker.record = record;
          }
        }
      };
      this.#workers.push(worker);
    }
  }

  set onmessage(handler: MessageHandler) {
    this.#onmessage = handler;
  }

  get messageBacklog() {
    return this.#recordQueue.length;
  }

  set query(query: TextEmbedderResult) {
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
  get similarity(): number | null {
    return this.#similarity;
  }

  addRecord(record: CommitCreateEvent) {
    for (const worker of this.#workers) {
      if (worker.available) {
        worker.record = record;
        return;
      }
    }
    this.#recordQueue.push(record);
  }
}

interface IEmbeddingWorker extends Omit<Worker, "postMessage"> {
  postMessage(message: QueryMessage | SimilarityMessage | RecordMessage): void;
}
type RecordHandler = ((record: CommitCreateEvent | null) => void) | null;

class EmbeddingWorker {
  #id: number;
  #manager: EmbeddingManager;
  #worker: IEmbeddingWorker;
  #available = false;
  #initialized = false;
  #record: CommitCreateEvent | null = null;
  #onmessage: RecordHandler = null;

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
        if (this.#manager.similarity !== null) {
          this.similarity = this.#manager.similarity;
        }
      }
      const record = this.#record;
      this.#record = null;
      this.#available = true;
      if (this.#onmessage) {
        this.#onmessage(event.data.recordMatched ? record : null);
      }
    };
  }

  get available() {
    return this.#available;
  }

  set onmessage(handler: RecordHandler) {
    this.#onmessage = handler;
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

  set record(record: CommitCreateEvent) {
    if (this.#initialized) {
      this.#record = record;
      this.#available = false;
      this.#worker.postMessage({ type: "record", record: record });
    }
  }
}

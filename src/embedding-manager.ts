/// <reference lib="dom" />
import { AppBskyFeedPost } from "@atproto/api";
import { TextEmbedderResult } from "@mediapipe/tasks-text";
import {
  AvailableMessage,
  PostHandler,
  QueryMessage,
  SimilarityMessage,
  TextMessage,
} from "./messages.ts";

export default class EmbeddingManager {
  #workers: EmbeddingWorker[] = [];
  #postQueue: AppBskyFeedPost.Record[] = [];
  #onmessage: PostHandler | null = null;
  #query: TextEmbedderResult | null = null;
  #similarity: number | null = null;

  constructor() {
    for (let i = 0; i < navigator.hardwareConcurrency; i++) {
      const worker = new EmbeddingWorker(this, i);
      worker.onmessage = (post) => {
        if (post) {
          if (this.#onmessage) {
            this.#onmessage(post);
          }
        }
        // This worker is now free, send it any backlog
        if (this.#postQueue.length > 0) {
          const post = this.#postQueue.shift();
          if (post) {
            worker.post = post;
          }
        }
      };
      this.#workers.push(worker);
    }
  }

  set onmessage(handler: PostHandler) {
    this.#onmessage = handler;
  }

  get messageBacklog() {
    return this.#postQueue.length;
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

  addPost(post: AppBskyFeedPost.Record) {
    for (const worker of this.#workers) {
      if (worker.available) {
        worker.post = post;
        return;
      }
    }
    this.#postQueue.push(post);
  }
}

interface IEmbeddingWorker extends Omit<Worker, "postMessage"> {
  postMessage(message: QueryMessage | SimilarityMessage | TextMessage): void;
}
type WorkerPostHandler =
  | ((post: AppBskyFeedPost.Record | null) => void)
  | null;

class EmbeddingWorker {
  #id: number;
  #manager: EmbeddingManager;
  #worker: IEmbeddingWorker;
  #available = false;
  #initialized = false;
  #post: AppBskyFeedPost.Record | null = null;
  #onmessage: WorkerPostHandler = null;

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
      const post = this.#post;
      this.#post = null;
      this.#available = true;
      if (this.#onmessage) {
        this.#onmessage(event.data.postMatched ? post : null);
      }
    };
  }

  get available() {
    return this.#available;
  }

  set onmessage(handler: WorkerPostHandler) {
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

  set post(post: AppBskyFeedPost.Record) {
    if (this.#initialized) {
      this.#post = post;
      this.#available = false;
      this.#worker.postMessage({ type: "text", text: post.text });
    }
  }
}

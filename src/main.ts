/// <reference lib="dom" />

import "./style.css";
import { TextEmbedder } from "@mediapipe/tasks-text";
import Jetstream, { CommitCreateEvent } from "./jetstream.ts";
import createEmbedder from "./embedder.ts";
import EmbeddingManager from "./embedding-manager.ts";
declare global {
  interface Window {
    // Provided by https://embed.bsky.app/static/embed.js
    scan(node?: Node): void;
  }
}

class SkySearchUI {
  static MAX_POSTS = 25;

  readonly postsEl: HTMLDivElement;
  readonly backlogEl: HTMLSpanElement;
  readonly backlogToastEl: HTMLDivElement;
  readonly queryEl: HTMLInputElement;
  readonly searchEl: HTMLButtonElement;
  readonly similarityEl: HTMLInputElement;
  readonly postTemplateEl: HTMLTemplateElement;
  readonly alertEl: HTMLDivElement;
  readonly alertMessageEl: HTMLSpanElement;
  readonly alertDismissEl: HTMLElement;

  private embeddingManager: EmbeddingManager;
  private textEmbedder: TextEmbedder;
  private jetstream: Jetstream | null = null;

  constructor(embeddingManager: EmbeddingManager, textEmbedder: TextEmbedder) {
    this.postsEl = $<HTMLDivElement>("#posts");
    this.backlogEl = $<HTMLSpanElement>("#backlog");
    this.backlogToastEl = $<HTMLDivElement>("#backlog-toast");
    this.queryEl = $<HTMLInputElement>("#query");
    this.searchEl = $<HTMLButtonElement>("#search");
    this.similarityEl = $<HTMLInputElement>("#similarity");
    this.postTemplateEl = $<HTMLTemplateElement>("#post-template");
    this.alertEl = $<HTMLDivElement>("#alert");
    this.alertMessageEl = $<HTMLSpanElement>("#alert-message");
    this.alertDismissEl = $<HTMLElement>("#alert-dismiss");

    this.embeddingManager = embeddingManager;
    this.textEmbedder = textEmbedder;

    this.similarityEl.valueAsNumber = Math.floor(
      this.embeddingManager.similarity * 100,
    );

    this.bindEvents();

    if (document.location.search) {
      const params = new URLSearchParams(document.location.search);
      const query = params.get("query");
      if (query) {
        this.queryEl.value = query;
        this.handleSearch();
      }
    }
  }

  private bindEvents(): void {
    this.searchEl.addEventListener("click", this.handleSearch.bind(this));
    this.similarityEl.addEventListener(
      "change",
      this.handleSimilarityChange.bind(this),
    );
    this.alertDismissEl.addEventListener("click", this.hideError.bind(this));

    this.embeddingManager.onmessage = this.handleNewPost.bind(this);
    // XXX Add error handler
    // this.embeddingManager.onerror = this.handleEmbeddingError.bind(this);
  }

  private handleSearch(): void {
    if (this.queryEl.value) {
      if (!this.jetstream) {
        this.jetstream = new Jetstream();
        this.jetstream.onmessage = (event) => {
          this.embeddingManager.addJetstreamCommit(event);
        };

        this.jetstream.onerror = (event) => {
          this.displayError(`Bluesky WebSocket error: ${event}`);
        };
      }

      this.embeddingManager.query = this.textEmbedder.embed(this.queryEl.value);
    }
  }

  private handleSimilarityChange(): void {
    this.embeddingManager.similarity = this.similarityEl.valueAsNumber / 100.0;
  }

  private handleNewPost(event: CommitCreateEvent): void {
    const postContent = this.postTemplateEl.content.cloneNode(
      true,
    ) as DocumentFragment;
    const postContainer = $<HTMLQuoteElement>("blockquote", postContent);

    if (postContent.firstElementChild) {
      postContainer.setAttribute(
        "data-bluesky-uri",
        `at://${event.did}/app.bsky.feed.post/${event.commit.rkey}`,
      );
      postContainer.setAttribute("data-bluesky-cid", event.commit.cid);
      self.scan(postContent);
      this.postsEl.insertBefore(postContent, this.postsEl.firstChild);
      while (this.postsEl.childElementCount > SkySearchUI.MAX_POSTS) {
        this.postsEl.lastElementChild?.remove();
      }
    }
    if (this.embeddingManager.messageBacklog > 50) {
      this.backlogEl.innerText = this.embeddingManager.messageBacklog
        .toString();
      this.backlogToastEl.classList.remove("hidden");
    } else {
      this.backlogToastEl.classList.add("hidden");
    }
  }

  // XXX add support
  // private handleEmbeddingError(event: any): void {
  //    this.displayError(`Embedding error: ${event}`);
  // }

  private displayError(error: string): void {
    this.alertMessageEl.innerText = error;
    this.alertEl.classList.remove("hidden");
  }

  private hideError(): void {
    this.alertEl.classList.add("hidden");
  }
}

function $<T extends Element>(
  selector: string,
  context: ParentNode = document,
): T {
  const element = context.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Element with selector "${selector}" not found.`);
  }
  return element;
}

document.addEventListener("DOMContentLoaded", async () => {
  const textEmbedder = await createEmbedder();
  const embeddingManager = new EmbeddingManager();
  new SkySearchUI(embeddingManager, textEmbedder);
});

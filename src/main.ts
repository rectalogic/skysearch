/// <reference lib="dom" />

import "./style.css";
import { TextEmbedder } from "@mediapipe/tasks-text";
import Jetstream, { BlueskyPost } from "./jetstream.ts";
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
  static BACKLOG_WARNING = 50;

  private postsEl: HTMLDivElement;
  private backlogEl: HTMLSpanElement;
  private backlogToastEl: HTMLDivElement;
  private queryEl: HTMLInputElement;
  private searchEl: HTMLButtonElement;
  private similarityEl: HTMLInputElement;
  private jetstreamToggleEl: HTMLInputElement;
  private postTemplateEl: HTMLTemplateElement;
  private alertToastEl: HTMLDivElement;
  private alertMessageEl: HTMLSpanElement;
  private alertDismissEl: HTMLElement;

  private embeddingManager: EmbeddingManager;
  private textEmbedder: TextEmbedder;
  private jetstream: Jetstream;

  constructor(embeddingManager: EmbeddingManager, textEmbedder: TextEmbedder) {
    this.postsEl = $<HTMLDivElement>("#posts");
    this.backlogEl = $<HTMLSpanElement>("#backlog");
    this.backlogToastEl = $<HTMLDivElement>("#backlog-toast");
    this.queryEl = $<HTMLInputElement>("#query");
    this.searchEl = $<HTMLButtonElement>("#search");
    this.similarityEl = $<HTMLInputElement>("#similarity");
    this.jetstreamToggleEl = $<HTMLInputElement>("#jetstream-toggle");
    this.postTemplateEl = $<HTMLTemplateElement>("#post-template");
    this.alertToastEl = $<HTMLDivElement>("#alert-toast");
    this.alertMessageEl = $<HTMLSpanElement>("#alert-message");
    this.alertDismissEl = $<HTMLElement>("#alert-dismiss");

    this.embeddingManager = embeddingManager;
    this.textEmbedder = textEmbedder;
    this.jetstream = new Jetstream();

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
    this.jetstreamToggleEl.addEventListener("change", () => {
      if (this.jetstreamToggleEl.checked) {
        this.jetstream.startStream();
      } else {
        this.jetstream.stopStream();
        this.embeddingManager.purgeBacklog();
        this.updateBacklog();
      }
    });

    this.embeddingManager.onmessage = this.handleNewPost.bind(this);
    this.embeddingManager.onerror = this.handleEmbeddingError.bind(this);

    this.jetstream.onmessage = (event) => {
      this.embeddingManager.addJetstreamCommit(event);
    };

    this.jetstream.onerror = (event) => {
      this.displayError(`Bluesky WebSocket error: ${event}`);
    };
  }

  private handleSearch(): void {
    if (this.queryEl.value) {
      this.jetstream.startStream();
      this.jetstreamToggleEl.checked = true;
      this.embeddingManager.query = this.textEmbedder.embed(this.queryEl.value);
    }
  }

  private handleSimilarityChange(): void {
    this.embeddingManager.similarity = this.similarityEl.valueAsNumber / 100.0;
  }

  private handleNewPost(post: BlueskyPost, similarity: number): void {
    const postContent = this.postTemplateEl.content.cloneNode(
      true,
    ) as DocumentFragment;
    const postContainer = $<HTMLQuoteElement>("blockquote", postContent);
    const postSimilarity = $<HTMLQuoteElement>("#post-similarity", postContent);
    postSimilarity.innerText = similarity.toFixed(2);
    postContainer.setAttribute(
      "data-bluesky-uri",
      post.uri,
    );
    postContainer.setAttribute("data-bluesky-cid", post.cid);
    self.scan(postContent);
    this.postsEl.insertBefore(postContent, this.postsEl.firstChild);
    while (this.postsEl.childElementCount > SkySearchUI.MAX_POSTS) {
      this.postsEl.lastElementChild?.remove();
    }

    this.updateBacklog();
  }

  private updateBacklog() {
    if (this.embeddingManager.messageBacklog > SkySearchUI.BACKLOG_WARNING) {
      this.backlogEl.innerText = this.embeddingManager.messageBacklog
        .toString();
      this.backlogToastEl.classList.remove("hidden");
    } else {
      this.backlogToastEl.classList.add("hidden");
    }
  }

  private handleEmbeddingError(event: ErrorEvent): void {
    this.displayError(`Embedding error: ${event}`);
  }

  private displayError(error: string): void {
    this.alertMessageEl.innerText = error;
    this.alertToastEl.classList.remove("hidden");
  }

  private hideError(): void {
    this.alertToastEl.classList.add("hidden");
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

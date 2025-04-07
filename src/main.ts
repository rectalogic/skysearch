/// <reference lib="dom" />

import "./style.css";
import Jetstream from "./jetstream.ts";
import createEmbedder from "./embedder.ts";
import EmbeddingManager from "./embedding-manager.ts";
declare global {
  interface Window {
    // Provided by https://embed.bsky.app/static/embed.js
    scan(node?: Node): void;
  }
}

const app = document.querySelector<HTMLDivElement>("#app");
const backlog = document.querySelector<HTMLSpanElement>("#backlog");
const postTemplate = document.querySelector<HTMLTemplateElement>(
  "#post-template",
);

if (!app || !backlog || !postTemplate) throw new Error("missing elements");

const textEmbedder = await createEmbedder();
const embeddingManager = new EmbeddingManager();

//XXX move into textfield
embeddingManager.query = textEmbedder.embed(
  "tariffs are tanking the stock market",
);
embeddingManager.similarity = 0.8;

embeddingManager.onmessage = (event) => {
  const postContent = postTemplate.content.cloneNode(true) as DocumentFragment;
  const postContainer = postContent.querySelector("blockquote");
  if (postContainer && postContent.firstElementChild) {
    postContainer.setAttribute(
      "data-bluesky-uri",
      `at://${event.did}/app.bsky.feed.post/${event.commit.rkey}`,
    );
    postContainer.setAttribute("data-bluesky-cid", event.commit.cid);
    self.scan(postContent);
    app.replaceChildren(postContent.firstElementChild);
  }
  backlog.innerText = embeddingManager.messageBacklog.toString();
};

const jetstream = new Jetstream();
jetstream.onmessage = (event) => {
  embeddingManager.addJetstreamCommit(event);
};

jetstream.onerror = (event) => {
  //XXX display alert in UI
  throw new Error(`Bluesky WebSocket error: ${event}`);
};

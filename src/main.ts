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

const posts = document.querySelector<HTMLDivElement>("#posts");
const backlog = document.querySelector<HTMLSpanElement>("#backlog");
const query = document.querySelector<HTMLInputElement>("#query");
const search = document.querySelector<HTMLButtonElement>("#search");
const similarity = document.querySelector<HTMLInputElement>("#similarity");
const postTemplate = document.querySelector<HTMLTemplateElement>(
  "#post-template",
);

if (!posts || !backlog || !query || !search || !similarity || !postTemplate) {
  throw new Error("missing elements");
}

const textEmbedder = await createEmbedder();
const embeddingManager = new EmbeddingManager();

search.addEventListener("click", () => {
  if (query.value) {
    embeddingManager.query = textEmbedder.embed(
      query.value,
    );
  }
});

similarity.valueAsNumber = Math.floor(embeddingManager.similarity * 100);
similarity.addEventListener("change", () => {
  embeddingManager.similarity = similarity.valueAsNumber / 100.0;
});

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
    posts.insertBefore(postContent, posts.firstChild);
    while (posts.childElementCount > 10) {
      posts.lastElementChild?.remove();
    }
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

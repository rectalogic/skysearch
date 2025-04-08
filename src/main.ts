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

const MAX_POSTS = 25;

const postsEl = document.querySelector<HTMLDivElement>("#posts");
const backlogEl = document.querySelector<HTMLSpanElement>("#backlog");
const queryEl = document.querySelector<HTMLInputElement>("#query");
const searchEl = document.querySelector<HTMLButtonElement>("#search");
const similarityEl = document.querySelector<HTMLInputElement>("#similarity");
const postTemplateEl = document.querySelector<HTMLTemplateElement>(
  "#post-template",
);
const alertEl = document.querySelector<HTMLDivElement>("#alert");
const alertMessageEl = document.querySelector<HTMLSpanElement>(
  "#alert-message",
);
const alertDismissEl = document.querySelector<HTMLButtonElement>(
  "#alert-dismiss",
);
if (
  !postsEl || !backlogEl || !queryEl || !searchEl || !similarityEl ||
  !postTemplateEl ||
  !alertEl || !alertMessageEl || !alertDismissEl
) {
  throw new Error("missing elements");
}

const displayError = (error: string) => {
  alertMessageEl.innerText = error;
  alertEl.classList.remove("hidden");
};

alertDismissEl.addEventListener("click", () => {
  alertEl.classList.add("hidden");
});

const textEmbedder = await createEmbedder();
const embeddingManager = new EmbeddingManager();

searchEl.addEventListener("click", () => {
  if (queryEl.value) {
    embeddingManager.query = textEmbedder.embed(
      queryEl.value,
    );
  }
});

similarityEl.valueAsNumber = Math.floor(embeddingManager.similarity * 100);
similarityEl.addEventListener("change", () => {
  embeddingManager.similarity = similarityEl.valueAsNumber / 100.0;
});

embeddingManager.onmessage = (event) => {
  const postContent = postTemplateEl.content.cloneNode(
    true,
  ) as DocumentFragment;
  const postContainer = postContent.querySelector("blockquote");
  if (postContainer && postContent.firstElementChild) {
    postContainer.setAttribute(
      "data-bluesky-uri",
      `at://${event.did}/app.bsky.feed.post/${event.commit.rkey}`,
    );
    postContainer.setAttribute("data-bluesky-cid", event.commit.cid);
    self.scan(postContent);
    postsEl.insertBefore(postContent, postsEl.firstChild);
    while (postsEl.childElementCount > MAX_POSTS) {
      postsEl.lastElementChild?.remove();
    }
  }
  backlogEl.innerText = embeddingManager.messageBacklog.toString();
};

// XXX add support
// embeddingManager.onerror = (event) => {
//   displayError(`Embedding error: ${event}`);
// };

const jetstream = new Jetstream();
jetstream.onmessage = (event) => {
  embeddingManager.addJetstreamCommit(event);
};

jetstream.onerror = (event) => {
  displayError(`Bluesky WebSocket error: ${event}`);
};

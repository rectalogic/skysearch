/// <reference lib="dom" />

import "./style.css";
import Jetstream from "./jetstream.ts";
import createEmbedder from "./embedder.ts";
import EmbeddingManager from "./embedding-manager.ts";

const app = document.querySelector<HTMLDivElement>("#app");
const backlog = document.querySelector<HTMLSpanElement>("#backlog");

if (!app || !backlog) throw new Error("missing divs");

const textEmbedder = await createEmbedder();
const embeddingManager = new EmbeddingManager();

//XXX move into textfield
embeddingManager.query = textEmbedder.embed(
  "tariffs are tanking the stock market",
);
embeddingManager.similarity = 0.8;

embeddingManager.onmessage = (event) => {
  app.innerText = event.commit.record.text;
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

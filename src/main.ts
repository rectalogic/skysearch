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

embeddingManager.onmessage = (record) => {
  app.innerHTML = record.commit.record.text;
  backlog.innerHTML = embeddingManager.messageBacklog.toString();
};

const jetstream = new Jetstream();
jetstream.onmessage = (record) => {
  embeddingManager.addRecord(record);
};

jetstream.onerror = (event) => {
  //XXX display alert in UI
  throw new Error(`Bluesky WebSocket error: ${event}`);
};

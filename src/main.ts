/// <reference lib="dom" />

import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("no app");
}

const embeddingWorker = new Worker(
  new URL("embedding-worker.js", import.meta.url).href,
  { type: "module", name: "embedding-worker" },
);

embeddingWorker.onmessage = (event) => {
  if (event.data === "ready") {
    embeddingWorker.onmessage = embeddingMessageHandler;
    embeddingWorker.postMessage({ "query": "tariff effects on stock market" });
  }
};

const embeddingMessageHandler = (event: MessageEvent) => {
  app.innerHTML = event.data.commit.record.text;
};

import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");
const embeddingWorker = new Worker(
  new URL("embedding-worker.js", import.meta.url).href,
  { type: "module", name: "embedding-worker" },
);
embeddingWorker.onmessage = (event) => {
  app.innerHTML = event.data.commit.record.text;
};

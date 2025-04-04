import { FilesetResolver, TextEmbedder } from "@mediapipe/tasks-text";

async function createEmbedder() {
  const textFiles = await FilesetResolver.forTextTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-text@0.10.0/wasm",
  );
  return await TextEmbedder.createFromOptions(textFiles, {
    baseOptions: {
      modelAssetPath:
        `https://storage.googleapis.com/mediapipe-models/text_embedder/universal_sentence_encoder/float32/1/universal_sentence_encoder.tflite`,
    },
  });
}

const textEmbedder = await createEmbedder();
const queryEmbedding = textEmbedder.embed("tariff effects on stock market");

const jetstreamWorker = new Worker(
  new URL("jetstream-worker.js", import.meta.url).href,
  { type: "module", name: "jetstream-worker" },
);
jetstreamWorker.onmessage = (event) => {
  const embedding = textEmbedder.embed(event.data.commit.record.text);
  if (
    TextEmbedder.cosineSimilarity(
      embedding.embeddings[0],
      queryEmbedding.embeddings[0],
    ) >= 0.8
  ) {
    postMessage(event.data);
  }
};

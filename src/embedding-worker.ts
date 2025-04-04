import { FilesetResolver, TextEmbedder } from "@mediapipe/tasks-text";

async function createEmbedder() {
  const textFiles = await FilesetResolver.forTextTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-text@0.10.22-rc.20250304/wasm",
  );
  // XXX this uses importScripts which is not legal in a worker
  // https://github.com/google-ai-edge/mediapipe/issues/5257
  return await TextEmbedder.createFromOptions(textFiles, {
    baseOptions: {
      modelAssetPath:
        `https://storage.googleapis.com/mediapipe-models/text_embedder/universal_sentence_encoder/float32/1/universal_sentence_encoder.tflite`,
    },
  });
}

try {
  const textEmbedder = await createEmbedder();
  const queryEmbedding = textEmbedder.embed("tariff effects on stock market");

  const jetstreamWorker = new Worker(
    new URL("jetstream-worker.js", import.meta.url).href,
    { type: "module", name: "jetstream-worker" },
  );

  jetstreamWorker.onmessage = (event) => {
    // Ensure textEmbedder is accessible here (it is due to closure)
    const embedding = textEmbedder.embed(event.data.commit.record.text);
    if (
      embedding.embeddings && embedding.embeddings[0] &&
      queryEmbedding.embeddings && queryEmbedding.embeddings[0] &&
      TextEmbedder.cosineSimilarity(
          embedding.embeddings[0],
          queryEmbedding.embeddings[0],
        ) >= 0.8
    ) {
      self.postMessage(event.data);
    }
  };

  console.log(
    "Embedding worker initialized and listening to Jetstream worker.",
  );
} catch (error) {
  console.error("Error initializing embedding worker:", error);
  // self.postMessage({ error: "Failed to initialize embedder" });
}

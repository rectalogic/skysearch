/// <reference lib="webworker" />

const ws = new WebSocket(
  "wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post",
);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.kind === "commit" && data.commit.operation === "create") {
    postMessage(data);
  }
};

ws.onerror = (event) => {
  throw new Error(`Bluesky WebSocket error: ${event}`);
};

ws.onclose = (event) => {
  throw new Error(`Disconnected from Bluesky WebSocket: ${event}`);
};

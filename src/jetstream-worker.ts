/// <reference lib="webworker" />

const ws = new WebSocket(
  "wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post",
);

ws.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    // XXX post a Transferable object? or just raw string and parse in embedding?
    postMessage(data);
  } catch (e) {
    console.log(`Raw message: ${event.data}`);
  }
};

ws.onerror = (error) => {
  console.log("WebSocket Error:", error);
};

ws.onclose = () => {
  console.log("Disconnected from Bluesky WebSocket");
};

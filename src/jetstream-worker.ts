const ws = new WebSocket(
  "wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post",
);

ws.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    postMessage(data);
  } catch (e) {
    console.log(`Raw message: ${event.data}`);
  }
};

ws.onerror = (error) => {
  console.log(`WebSocket Error: ${error.message}`);
};

ws.onclose = () => {
  console.log("Disconnected from Bluesky WebSocket");
};

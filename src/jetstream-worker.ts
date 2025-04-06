/// <reference lib="webworker" />

import Jetstream from "./jetstream.ts";

const jetstream = new Jetstream();
jetstream.onmessage = (data) => {
  if (jetstream.messageCount % 100 === 0) {
    console.log(`jetstream ${jetstream.messageCount}`);
  }
  postMessage(data);
};

jetstream.onerror = (event) => {
  throw new Error(`Bluesky WebSocket error: ${event}`);
};

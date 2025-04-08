# SkySearch

Subscribe to [BlueSky Jetstream](https://docs.bsky.app/blog/jetstream),
compute an embedding for every post using [MediaPipe Text Embedder](https://ai.google.dev/edge/mediapipe/solutions/text/text_embedder/web_js),
and compare cosine similarity to a query.
Display any posts that are semantically similar enough to the query.

# Live Site

https://rectalogic.com/skysearch/?query=tariffs+are+tanking+the+stock+market

# Implementation

Static site running entirely in the users browser.

* Compute a text embedding for the users query text.
* Spawn a bunch of [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) based on [navigator.hardwareConcurrency](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/hardwareConcurrency)
ready to compute text embeddings and compare their similarity to the users query embedding.
* Create a WebSocket subscribed to the BlueSky Jetstream.
  For each post received, send it to the first available worker.
  If none available, add the post to the backlog.
* A worker sends a message back indicating if the post embedding was similar
  enough to the users query (based on the similariy range slider the user controls).
  If it is, then append a BlueSky embed displaying the post.

# Development

Install [deno](https://deno.com). Then `deno install` and `deno task dev`.

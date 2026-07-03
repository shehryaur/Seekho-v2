/**
 * lib/inngest/client.ts
 *
 * Inngest client. Inngest is used for background job processing (long-running
 * lesson generation). If you're not using Inngest yet, this file is still safe
 * to have — it won't execute unless events are sent.
 *
 * In dev: leave INNGEST_EVENT_KEY / INNGEST_SIGNING_KEY blank.
 * In prod: get keys from https://app.inngest.com → Your App → Manage → Keys
 */

import { Inngest, EventSchemas } from "inngest";

export const inngest = new Inngest({
  id: "seekho-engine",
  name: "Seekho Engine",
  eventKey: process.env.INNGEST_EVENT_KEY,
  signingKey: process.env.INNGEST_SIGNING_KEY,
  schemas: new EventSchemas().fromZod(),
});

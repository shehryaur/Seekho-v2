/**
 * app/api/inngest/route.ts
 *
 * Inngest serve endpoint. Mounts the Inngest SDK so the Inngest dashboard
 * can discover and invoke your background functions.
 *
 * If you're not using Inngest, this route is still safe — it just serves
 * an empty function list until you register jobs.
 */

import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { allFunctions } from "@/lib/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: allFunctions,
});

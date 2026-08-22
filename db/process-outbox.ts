import { loadEnvConfig } from "@next/env";

import { closeDbConnection } from "./index";
import { processNotificationOutbox } from "../services/outbox-service";

loadEnvConfig(process.cwd());

processNotificationOutbox()
  .then((result) => console.info("Notification outbox processing complete", result))
  .catch((error: unknown) => {
    console.error("Notification outbox processing failed", error);
    process.exitCode = 1;
  })
  .finally(closeDbConnection);

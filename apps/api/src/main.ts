import { createApp } from "./composition-root.js";
import { loadConfig } from "./config.js";

const config = loadConfig(process.env);
const app = await createApp(config);
await app.listen({ port: config.port, host: "0.0.0.0" });

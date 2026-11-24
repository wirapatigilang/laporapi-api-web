import { createApp } from "./app";
import { config } from "./config";

createApp().listen(config.port);
console.log(`Lapor Api API berjalan di http://localhost:${config.port}`);

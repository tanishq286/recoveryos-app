import { Logger } from "@nestjs/common";

import { createApp } from "./bootstrap.js";
import { ENV, type Env } from "./config/env.js";

const app = await createApp();
const env = app.get<Env>(ENV);
await app.listen(env.PORT);
new Logger("FinsolEnterprises").log(`API listening on http://localhost:${env.PORT}/api/v1`);

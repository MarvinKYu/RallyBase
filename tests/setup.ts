import { config } from "dotenv";

// Load .env then .env.local (local overrides)
config({ path: ".env" });
config({ path: ".env.local" });

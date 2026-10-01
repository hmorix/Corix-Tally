// Loads whichever generated Prisma Client matches the detected provider.
// Both generated clients expose the exact same model API (see the schema
// templates' comments for why), so nothing else in this server needs to
// know or care which database is actually running.
import { detectProvider } from "./lib/detectProvider.js";

export const providerInfo = detectProvider();

const generatedPath = providerInfo.family === "mongo" ? "./generated/mongo/index.js" : "./generated/relational/index.js";

const { PrismaClient } = await import(generatedPath);
export const prisma = new PrismaClient();

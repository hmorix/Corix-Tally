import { PrismaClient } from "@prisma/client";
import { detectProvider } from "./lib/detectProvider.js";

export const providerInfo = detectProvider();
export const prisma = new PrismaClient();

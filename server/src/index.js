import "dotenv/config";
import express from "express";
import cors from "cors";
import { providerInfo } from "./db.js";
import authRoutes from "./routes/auth.js";
import companiesRoutes from "./routes/companies.js";
import ledgersRoutes from "./routes/ledgers.js";
import vouchersRoutes from "./routes/vouchers.js";
import auditRoutes from "./routes/audit.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true, provider: providerInfo.label }));
app.use("/api/auth", authRoutes);
app.use("/api/companies", companiesRoutes);
app.use("/api/ledgers", ledgersRoutes);
app.use("/api/vouchers", vouchersRoutes);
app.use("/api/audit", auditRoutes);

// Central error handler — every route is wrapped in asyncHandler, so any
// thrown/rejected error (including assertOwnsCompany()'s 404s) lands here
// instead of hanging the request.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Corix Tally API listening on :${port} — database: ${providerInfo.label}`);
});

import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router = Router();
router.use(requireAuth);

async function assertOwnsCompany(userId, companyId) {
  const company = await prisma.company.findFirst({ where: { id: companyId, userId } });
  if (!company) throw Object.assign(new Error("Company not found or not yours"), { status: 404 });
}

router.get("/", asyncHandler(async (req, res) => {
  const { companyId } = req.query;
  if (!companyId) return res.status(400).json({ error: "companyId is required" });
  await assertOwnsCompany(req.userId, companyId);
  const [groups, ledgers] = await Promise.all([
    prisma.ledgerGroup.findMany({ where: { companyId } }),
    prisma.ledger.findMany({ where: { companyId }, orderBy: { name: "asc" } })
  ]);
  res.json({ groups, ledgers: ledgers.map(numeric) });
}));

router.post("/", asyncHandler(async (req, res) => {
  const { id, companyId, name, group_id, opening_balance, opening_balance_type, gst_rate } = req.body;
  await assertOwnsCompany(req.userId, companyId);
  const data = {
    companyId, name, groupId: group_id || null,
    openingBalance: Number(opening_balance || 0),
    openingBalanceType: opening_balance_type || "debit",
    gstRate: gst_rate != null && gst_rate !== "" ? Number(gst_rate) : null
  };
  // Upsert on a client-supplied id (the frontend always generates one before
  // calling this, same as the Supabase path) so the optimistic local record
  // and the server row are the same id from the start — no remapping step.
  const ledger = id
    ? await prisma.ledger.upsert({ where: { id }, create: { id, ...data }, update: data })
    : await prisma.ledger.create({ data });
  res.json({ ledger: numeric(ledger) });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const ledger = await prisma.ledger.findUnique({ where: { id: req.params.id } });
  if (!ledger) return res.status(404).json({ error: "Not found" });
  await assertOwnsCompany(req.userId, ledger.companyId);
  const inUse = await prisma.voucherEntry.findFirst({ where: { ledgerId: req.params.id } });
  if (inUse) return res.status(409).json({ error: "This ledger has voucher entries — delete those first." });
  await prisma.ledger.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

function numeric(l) {
  return { ...l, openingBalance: Number(l.openingBalance), gstRate: l.gstRate == null ? null : Number(l.gstRate) };
}

export default router;

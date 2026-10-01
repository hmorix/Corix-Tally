import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { nextVoucherNumber } from "../lib/voucherNumber.js";

const router = Router();
router.use(requireAuth);

async function assertOwnsCompany(userId, companyId) {
  const company = await prisma.company.findFirst({ where: { id: companyId, userId } });
  if (!company) throw Object.assign(new Error("Company not found or not yours"), { status: 404 });
  return company;
}

async function ownedCompanyIds(userId) {
  const companies = await prisma.company.findMany({ where: { userId }, select: { id: true } });
  return companies.map((c) => c.id);
}

router.get("/", asyncHandler(async (req, res) => {
  const { companyId } = req.query;
  if (!companyId) return res.status(400).json({ error: "companyId is required" });
  await assertOwnsCompany(req.userId, companyId);
  const vouchers = await prisma.voucher.findMany({ where: { companyId }, orderBy: { voucherDate: "desc" } });
  const entries = vouchers.length
    ? await prisma.voucherEntry.findMany({ where: { voucherId: { in: vouchers.map((v) => v.id) } } })
    : [];
  res.json({ vouchers: vouchers.map(dateStr), entries: entries.map(numeric) });
}));

router.post("/", asyncHandler(async (req, res) => {
  const { id, companyId, voucher_type, voucher_date, narration, party_name, party_gstin, place_of_supply, invoice_number, lines } = req.body;
  await assertOwnsCompany(req.userId, companyId);

  const validLines = (lines || []).filter((l) => l.ledger_id && (Number(l.debit) || Number(l.credit)));
  const dr = validLines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const cr = validLines.reduce((s, l) => s + Number(l.credit || 0), 0);
  if (!validLines.length || dr !== cr) return res.status(400).json({ error: "Debit and credit totals must match." });

  // 50,000-entries-per-user safety cap — same limit as the Supabase trigger.
  const companyIds = await ownedCompanyIds(req.userId);
  const existingVoucherIds = (await prisma.voucher.findMany({ where: { companyId: { in: companyIds } }, select: { id: true } })).map((v) => v.id);
  const currentEntryCount = existingVoucherIds.length
    ? await prisma.voucherEntry.count({ where: { voucherId: { in: existingVoucherIds } } })
    : 0;
  if (!id && currentEntryCount + validLines.length > 50000) {
    return res.status(400).json({ error: "Entry limit reached (50,000). Delete old practice data to continue." });
  }

  let voucherNumber = req.body.voucher_number;
  if (!voucherNumber) {
    const sameType = await prisma.voucher.findMany({ where: { companyId, voucherType: voucher_type } });
    voucherNumber = nextVoucherNumber(voucher_type, id ? sameType.filter((v) => v.id !== id) : sameType, voucher_date);
  }

  const data = {
    companyId, voucherType: voucher_type, voucherNumber, voucherDate: new Date(voucher_date), narration: narration || null,
    partyName: party_name || null, partyGstin: party_gstin || null, placeOfSupply: place_of_supply || null, invoiceNumber: invoice_number || null
  };

  // Same client-supplied-id upsert pattern as ledgers.js — see its comment.
  const voucher = id
    ? await prisma.voucher.upsert({ where: { id }, create: { id, ...data }, update: data })
    : await prisma.voucher.create({ data });

  if (id) await prisma.voucherEntry.deleteMany({ where: { voucherId: voucher.id } });
  if (validLines.length) {
    await prisma.voucherEntry.createMany({
      data: validLines.map((l) => ({ voucherId: voucher.id, ledgerId: l.ledger_id, debit: Number(l.debit || 0), credit: Number(l.credit || 0) }))
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: req.userId, companyId, entityType: "voucher", entityId: voucher.id,
      action: id ? "update" : "create", detail: `${voucher_type} voucher ${voucherNumber}`
    }
  });

  const entries = await prisma.voucherEntry.findMany({ where: { voucherId: voucher.id } });
  res.json({ voucher: dateStr(voucher), entries: entries.map(numeric) });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const voucher = await prisma.voucher.findUnique({ where: { id: req.params.id } });
  if (!voucher) return res.status(404).json({ error: "Not found" });
  await assertOwnsCompany(req.userId, voucher.companyId);
  await prisma.voucherEntry.deleteMany({ where: { voucherId: req.params.id } });
  await prisma.voucher.delete({ where: { id: req.params.id } });
  await prisma.auditLog.create({
    data: { userId: req.userId, companyId: voucher.companyId, entityType: "voucher", entityId: voucher.id, action: "delete", detail: `${voucher.voucherType} voucher ${voucher.voucherNumber || ""}`.trim() }
  });
  res.json({ ok: true });
}));

function dateStr(v) { return { ...v, voucherDate: v.voucherDate.toISOString().slice(0, 10) }; }
function numeric(e) { return { ...e, debit: Number(e.debit), credit: Number(e.credit) }; }

export default router;

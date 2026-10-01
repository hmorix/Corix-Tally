import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { DEFAULT_GROUPS } from "../lib/seedGroups.js";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(async (req, res) => {
  const companies = await prisma.company.findMany({ where: { userId: req.userId }, orderBy: { createdAt: "asc" } });
  res.json({ companies });
}));

router.post("/", asyncHandler(async (req, res) => {
  const { name, gstin, state } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Company name is required" });
  const company = await prisma.company.create({ data: { userId: req.userId, name, gstin: gstin || null, state: state || null } });
  await prisma.ledgerGroup.createMany({
    data: DEFAULT_GROUPS.map((g) => ({ companyId: company.id, name: g.name, nature: g.nature, isSystem: true }))
  });
  res.json({ company });
}));

export default router;

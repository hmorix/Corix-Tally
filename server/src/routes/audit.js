import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(async (req, res) => {
  const { companyId } = req.query;
  const where = { userId: req.userId, ...(companyId ? { companyId } : {}) };
  const logs = await prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  res.json({ logs });
}));

export default router;

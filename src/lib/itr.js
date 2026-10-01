// ITR ("Income Tax Return") computation summary.
//
// Important honesty note (also shown in the ITRSummary page): India's
// income-tax e-filing portal does NOT accept a bulk CSV/Excel upload the
// way the GST portal accepts offline-utility CSVs — ITRs are filed via the
// portal's own JSON/utility schema, usually with a CA or the official
// utility. What this file produces is a clean CSV/Excel *computation sheet*
// — Schedule BP (Business & Profession) and a simple Balance Sheet extract
// — laid out the way those schedules are laid out, so you (or a CA) can
// transcribe it into the actual filing quickly. It is not itself a filing.

export function buildScheduleBP(profitAndLoss) {
  const { income, expense, totalIncome, totalExpense, netProfit } = profitAndLoss;
  return {
    rows: [
      { particulars: "Gross receipts / turnover", amount: totalIncome },
      ...income.map((r) => ({ particulars: `  ${r.name}`, amount: r.amount })),
      { particulars: "Total expenses", amount: totalExpense },
      ...expense.map((r) => ({ particulars: `  ${r.name}`, amount: r.amount })),
      { particulars: "Net Profit before tax (Schedule BP, item 36)", amount: netProfit }
    ],
    netProfit
  };
}

/**
 * Simple Balance Sheet extract from the Trial Balance: assets vs liabilities,
 * grouped by each ledger's group nature. Matches Schedule BS's broad shape
 * (Sources of funds / Application of funds) at a summary level, not the
 * portal's full line-item schedule.
 */
export function buildScheduleBS(trialBalanceRows, ledgerById, groupsById) {
  const assets = [];
  const liabilities = [];

  for (const row of trialBalanceRows) {
    const ledger = ledgerById.get(row.ledgerId);
    const nature = groupsById.get(ledger?.group_id)?.nature;
    if (nature === "asset" && row.debit) assets.push({ name: row.name, amount: row.debit });
    if (nature === "liability" && row.credit) liabilities.push({ name: row.name, amount: row.credit });
  }

  const totalAssets = assets.reduce((s, r) => s + r.amount, 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + r.amount, 0);

  return { assets, liabilities, totalAssets, totalLiabilities };
}

export function flattenForExport(scheduleBP, scheduleBS) {
  const rows = [{ section: "Schedule BP", particulars: "", amount: "" }];
  for (const r of scheduleBP.rows) rows.push({ section: "", particulars: r.particulars, amount: r.amount });
  rows.push({ section: "Schedule BS — Assets", particulars: "", amount: "" });
  for (const r of scheduleBS.assets) rows.push({ section: "", particulars: r.name, amount: r.amount });
  rows.push({ section: "Schedule BS — Liabilities", particulars: "", amount: "" });
  for (const r of scheduleBS.liabilities) rows.push({ section: "", particulars: r.name, amount: r.amount });
  return rows;
}

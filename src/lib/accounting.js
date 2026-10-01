// Pure accounting math — no Supabase calls in here, so it's easy to unit-test
// and easy to reuse (e.g. from a report page or a CSV export).

/**
 * Build the Day Book: every voucher with its entries, for a date range.
 * @param {Array} vouchers - rows from `vouchers` table
 * @param {Array} entries - rows from `voucher_entries` table
 * @param {Map} ledgerById - Map<ledger_id, ledger row>
 */
export function buildDayBook(vouchers, entries, ledgerById) {
  const entriesByVoucher = groupBy(entries, "voucher_id");
  return vouchers
    .slice()
    .sort((a, b) => a.voucher_date.localeCompare(b.voucher_date))
    .map((v) => ({
      ...v,
      entries: (entriesByVoucher[v.id] || []).map((e) => ({
        ...e,
        ledgerName: ledgerById.get(e.ledger_id)?.name || "Unknown ledger"
      }))
    }));
}

/**
 * Trial Balance: net closing balance per ledger = opening balance +/- entries.
 * Convention: asset & expense ledgers are naturally debit; liability & income
 * ledgers are naturally credit. The function returns every ledger's side
 * (debit column or credit column) so the two columns always foot to the same
 * total when the books are actually balanced.
 */
export function buildTrialBalance(ledgers, entries) {
  const entriesByLedger = groupBy(entries, "ledger_id");

  return ledgers.map((ledger) => {
    const rows = entriesByLedger[ledger.id] || [];
    const debitSum = rows.reduce((s, r) => s + Number(r.debit || 0), 0);
    const creditSum = rows.reduce((s, r) => s + Number(r.credit || 0), 0);

    const openingDebit = ledger.opening_balance_type === "debit" ? Number(ledger.opening_balance) : 0;
    const openingCredit = ledger.opening_balance_type === "credit" ? Number(ledger.opening_balance) : 0;

    const netDebit = openingDebit + debitSum;
    const netCredit = openingCredit + creditSum;
    const closing = netDebit - netCredit;

    return {
      ledgerId: ledger.id,
      name: ledger.name,
      group: ledger.group_id,
      debit: closing > 0 ? closing : 0,
      credit: closing < 0 ? -closing : 0
    };
  });
}

/**
 * Profit & Loss: sum every ledger whose group's nature is income/expense.
 * groupsById: Map<group_id, ledger_group row> so we know each ledger's nature.
 */
export function buildProfitAndLoss(ledgers, entries, groupsById) {
  const trial = buildTrialBalance(ledgers, entries);
  const byId = new Map(ledgers.map((l) => [l.id, l]));

  const income = [];
  const expense = [];

  for (const row of trial) {
    const ledger = byId.get(row.ledgerId);
    const nature = groupsById.get(ledger?.group_id)?.nature;
    if (nature === "income") {
      const amount = row.credit - row.debit; // income is credit-natured
      if (amount !== 0) income.push({ name: row.name, amount });
    } else if (nature === "expense") {
      const amount = row.debit - row.credit; // expense is debit-natured
      if (amount !== 0) expense.push({ name: row.name, amount });
    }
  }

  const totalIncome = income.reduce((s, r) => s + r.amount, 0);
  const totalExpense = expense.reduce((s, r) => s + r.amount, 0);

  return {
    income,
    expense,
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense
  };
}

export function formatINR(n) {
  const sign = n < 0 ? "-" : "";
  return sign + Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    (acc[item[key]] = acc[item[key]] || []).push(item);
    return acc;
  }, {});
}

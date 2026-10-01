// Minimal Google Sheets REST client — just the one call this app needs
// (append rows), via fetch, no SDK. Called with a short-lived OAuth access
// token obtained through src/lib/googleAuth.js.

/**
 * Appends rows to a sheet. `rows` is an array of plain objects; the first
 * push also writes a header row from their keys. Uses the `values:append`
 * endpoint with valueInputOption=USER_ENTERED so numbers/dates are
 * recognised as such in the sheet, not left as literal text.
 */
export async function pushRowsToSheet(accessToken, spreadsheetId, rows, { sheetName = "Sheet1", withHeader = true } = {}) {
  if (!rows.length) return { appended: 0 };
  const headers = Object.keys(rows[0]);
  const values = [
    ...(withHeader ? [headers] : []),
    ...rows.map((r) => headers.map((h) => r[h] ?? ""))
  ];

  const range = `${sheetName}!A1`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ values })
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body?.error?.message || `Sheets API error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return { appended: rows.length };
}

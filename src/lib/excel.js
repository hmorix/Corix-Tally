// Excel (.xlsx) import/export. xlsx (~450KB) is dynamically imported so it
// only loads when the user actually clicks "Import/Export Excel".

export async function exportToExcel(rows, filename, sheetName = "Sheet1") {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

export async function importFromExcel(file) {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const firstSheet = wb.SheetNames[0];
  return XLSX.utils.sheet_to_json(wb.Sheets[firstSheet]);
}

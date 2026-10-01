// CSV import/export. papaparse is dynamically imported so its ~20KB never
// loads on screens that don't touch CSV (keeps the initial bundle small).

export async function exportToCSV(rows, filename) {
  const Papa = (await import("papaparse")).default;
  const csv = Papa.unparse(rows);
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), filename);
}

export function importFromCSV(file) {
  return new Promise(async (resolve, reject) => {
    const Papa = (await import("papaparse")).default;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => resolve(result.data),
      error: reject
    });
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

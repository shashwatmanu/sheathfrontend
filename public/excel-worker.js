importScripts('/xlsx.full.min.js');

self.onmessage = function(e) {
  const data = e.data;
  try {
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
    postMessage({ result: jsonData });
  } catch (err) {
    postMessage({ error: err.message || "Failed to parse Excel file" });
  }
};

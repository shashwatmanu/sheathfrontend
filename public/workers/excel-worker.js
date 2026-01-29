importScripts('./xlsx.full.min.js');

self.onmessage = function(e) {
  try {
    const arrayBuffer = e.data;

    // Perform parsing
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    self.postMessage({
      status: 'success',
      data: jsonData
    });
  } catch (error) {
    self.postMessage({
      status: 'error',
      message: error.message
    });
  }
};

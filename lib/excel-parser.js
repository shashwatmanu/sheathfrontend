export const parseExcelInWorker = (arrayBuffer) => {
  return new Promise((resolve, reject) => {
    const worker = new Worker('/excel-worker.js');

    worker.onmessage = (e) => {
      const { data } = e;
      if (data.error) {
        reject(new Error(data.error));
      } else {
        resolve(data.result);
      }
      worker.terminate();
    };

    worker.onerror = (err) => {
      reject(err);
      worker.terminate();
    };

    worker.postMessage(arrayBuffer, [arrayBuffer]);
  });
};

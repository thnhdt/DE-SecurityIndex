const { minioClient, GOLD_BUCKET } = require('../config/lakehouse');
const parquet = require('@dsnp/parquetjs');
const fs = require('fs');
const path = require('path');
const os = require('os');

BigInt.prototype.toJSON = function() { return this.toString() };

const getHourlySecurityIndex = async () => {
  const objectName = 'gold_hourly_security_index/part-00000-34bfc6c9-1c16-48d3-b94b-7b1f0e00139a-c000.snappy.parquet';
  const tempFilePath = path.join(os.tmpdir(), `security_index_${Date.now()}.parquet`);

  try {
    await minioClient.fGetObject(GOLD_BUCKET, objectName, tempFilePath);
    let reader = await parquet.ParquetReader.openFile(tempFilePath);
    let cursor = reader.getCursor();
    let records = [];
    let record = null;

    while (record = await cursor.next()) {
      const cleanedRecord = { ...record };
      for (let key in cleanedRecord) {
        if (typeof cleanedRecord[key] === 'bigint') {
          cleanedRecord[key] = cleanedRecord[key].toString();
        }
      }
      records.push(cleanedRecord);
    }
    await reader.close();
    return records;
  } catch (err) {
    console.error("Error reading security index:", err);
    throw err;
  } finally {
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
  }
};

module.exports = { getHourlySecurityIndex };

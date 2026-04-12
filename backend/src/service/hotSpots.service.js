const { minioClient, GOLD_BUCKET, HOTSPOTS_PATH } = require('../config/lakehouse');
const parquet = require('@dsnp/parquetjs');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Fix for BigInt serialization (JSON.stringify doesn't support BigInt)
BigInt.prototype.toJSON = function() { return this.toString() };

/**
 * Helper to process a single parquet file from MinIO
 */
const readParquetFile = async (objectName, startTime, endTime) => {
  const results = [];
  const tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${path.basename(objectName)}`);

  try {
    // 1. Download file from MinIO
    await minioClient.fGetObject(GOLD_BUCKET, objectName, tempFilePath);

    // 2. Open Parquet reader
    let reader = await parquet.ParquetReader.openFile(tempFilePath);
    let cursor = reader.getCursor();
    let record = null;

    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    // 3. Iterate through rows and filter
    while (record = await cursor.next()) {
      const rowTime = new Date(record.event_time).getTime();

      if (rowTime >= start && rowTime <= end) {
        results.push(record);
      }
    }
    await reader.close();
  } catch (err) {
    console.error(`Error processing ${objectName}:`, err);
  } finally {
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
  }
  return results;
};

/**
 * Get all hotspots by using a very wide time range
 */
const getAllHotspotsData = async () => {
  return await getHotspotdataByTimeRange('1970-01-01', '2099-12-31');
};

/**
 * Get hotspots within a specific range
 */
const getHotspotdataByTimeRange = async (startTime, endTime) => {
  return new Promise((resolve, reject) => {
    const stream = minioClient.listObjectsV2(GOLD_BUCKET, HOTSPOTS_PATH, true);
    const promises = [];

    stream.on('data', (obj) => {
      if (obj.name.endsWith('.parquet')) {
        console.log(`Found data file: ${obj.name}`);
        promises.push(readParquetFile(obj.name, startTime, endTime));
      }
    });

    stream.on('error', (err) => {
      console.error("MinIO Stream Error:", err);
      reject(err);
    });

    stream.on('end', async () => {
      try {
        const resultsArray = await Promise.all(promises);
        const flattened = resultsArray.flat();
        console.log(`Total records found: ${flattened.length}`);
        resolve(flattened);
      } catch (err) {
        reject(err);
      }
    });
  });
};

module.exports = { getAllHotspotsData, getHotspotdataByTimeRange };
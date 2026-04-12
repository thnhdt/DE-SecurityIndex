const { minioClient, GOLD_BUCKET, HOTSPOTS_PATH } = require('../config/lakehouse');
const parquet = require('@dsnp/parquetjs'); // Ensure you use this or @dsi-sh/parquetjs
const fs = require('fs');
const path = require('path');
const os = require('os');

// CRITICAL: Fix for BigInt serialization
BigInt.prototype.toJSON = function() { return this.toString() };

/**
 * Helper to process a single parquet file from MinIO
 */
const readParquetFileTimeRange = async (objectName, startTime, endTime, type) => {
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
      let rawTime = record.event_time;

      // Handle BigInt conversion
      if (typeof rawTime === 'bigint') {
        rawTime = Number(rawTime);
      }

      // SPARK PRECISION FIX: 
      // Spark Microseconds (16 digits) -> JS Milliseconds (13 digits)
      if (rawTime > 9999999999999) {
        rawTime = Math.floor(rawTime / 1000);
      }

      // Handle "0" or null values gracefully
      const rowTime = rawTime ? new Date(rawTime).getTime() : 0;
      const typeMatch = !type || record.incident_type?.toLowerCase().trim() === type.toLowerCase().trim();
      if (rowTime >= start && rowTime <= end && typeMatch) {
        // Clean the record: replace BigInts with Strings for safety
        const cleanedRecord = { ...record };
        for (let key in cleanedRecord) {
          if (typeof cleanedRecord[key] === 'bigint') {
            cleanedRecord[key] = cleanedRecord[key].toString();
          }
        }
        
        // Add a human-readable date for the frontend
        cleanedRecord.event_time_iso = rowTime !== 0 ? new Date(rowTime).toISOString() : null;
        
        results.push(cleanedRecord);
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

const getAllHotspotsData = async () => {
  // Use a wide range to catch all historical data
  return await getHotspotdataByTimeRange('1900-01-01', '2099-12-31');
};

const getHostspotdataByType = async (type) => {
    return new Promise((resolve, reject) => {
    const stream = minioClient.listObjectsV2(GOLD_BUCKET, HOTSPOTS_PATH, true);
    const promises = [];

    stream.on('data', (obj) => {
      if (obj.name.endsWith('.parquet')) {
        console.log(`Analyzing file: ${obj.name}`);
        promises.push(readParquetFileTimeRange(obj.name, '1900-01-01', '2099-12-31', type));
      }
    });

    stream.on('error', (err) => reject(err));

    stream.on('end', async () => {
      try {
        const resultsArray = await Promise.all(promises);
        const flattened = resultsArray.flat();
        console.log(`Success! Found ${flattened.length} total records.`);
        resolve(flattened);
      } catch (err) {
        reject(err);
      }
    });
  });
}

const getHotspotdataByTimeRange = async (startTime, endTime) => {
  return new Promise((resolve, reject) => {
    const stream = minioClient.listObjectsV2(GOLD_BUCKET, HOTSPOTS_PATH, true);
    const promises = [];

    stream.on('data', (obj) => {
      if (obj.name.endsWith('.parquet')) {
        console.log(`Analyzing file: ${obj.name}`);
        promises.push(readParquetFileTimeRange(obj.name, startTime, endTime));
      }
    });

    stream.on('error', (err) => reject(err));

    stream.on('end', async () => {
      try {
        const resultsArray = await Promise.all(promises);
        const flattened = resultsArray.flat();
        console.log(`Success! Found ${flattened.length} total records.`);
        resolve(flattened);
      } catch (err) {
        reject(err);
      }
    });
  });
};

module.exports = { getAllHotspotsData, getHotspotdataByTimeRange, getHostspotdataByType };
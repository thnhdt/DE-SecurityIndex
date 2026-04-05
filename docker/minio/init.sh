#!/bin/bash
# MinIO initialization: create medallion layer buckets and copy pre-downloaded data to bronze
set -e

echo "Waiting for MinIO to be ready..."
until mc alias set myminio http://minio:9000 minioadmin minioadmin 2>/dev/null; do
  sleep 2
done

echo "Creating medallion layer buckets..."
mc mb --ignore-existing myminio/raw-landing
mc mb --ignore-existing myminio/bronze
mc mb --ignore-existing myminio/silver
mc mb --ignore-existing myminio/gold

echo "Distributing data into buckets..."
if [ -d "/data" ] && [ "$(ls -A /data 2>/dev/null)" ]; then
  # For each source (vnexpress, soha, etc.)
  for source_dir in /data/*/; do
    source_name=$(basename "$source_dir")

    # raw data (data.json) → raw-landing bucket
    if [ -f "$source_dir/data.json" ]; then
      mc cp "$source_dir/data.json" "myminio/raw-landing/$source_name/data.json"
      echo "  raw-landing/$source_name/data.json ✓"
    fi

    # clean data (data-clean.json) → bronze bucket
    if [ -f "$source_dir/data-clean.json" ]; then
      mc cp "$source_dir/data-clean.json" "myminio/bronze/$source_name/data-clean.json"
      echo "  bronze/$source_name/data-clean.json ✓"
    fi

    # clean report (data-clean-report.json) → bronze bucket
    if [ -f "$source_dir/data-clean-report.json" ]; then
      mc cp "$source_dir/data-clean-report.json" "myminio/bronze/$source_name/data-clean-report.json"
      echo "  bronze/$source_name/data-clean-report.json ✓"
    fi
  done
  echo "Data distribution complete."
else
  echo "Warning: /data is empty or does not exist. Skipping data copy."
fi

echo ""
echo "MinIO initialization complete."
echo "Buckets:"
mc ls myminio/
echo "raw-landing contents:"
mc ls --recursive myminio/raw-landing/ 2>/dev/null || echo "  (empty)"
echo "bronze contents:"
mc ls --recursive myminio/bronze/ 2>/dev/null || echo "  (empty)"

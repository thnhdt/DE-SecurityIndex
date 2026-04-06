# DE-SecurityIndex

Data Lakehouse pipeline for Security Index analysis using ELT (Extract-Load-Transform) architecture with Medallion layers.

## Architecture

| Component | Tool | Port |
|-----------|------|------|
| Data Lake | MinIO | 9000 (API), 9001 (Console) |
| Processing | Apache Spark 3.5 | 7077 (cluster), 8081 (UI) |
| Orchestration | Apache Airflow 2.8 | 8080 (UI) |
| Catalog | Unity Catalog OSS | 8181 (API) |
| Metadata DB | PostgreSQL 15 | 5432 |

## Project Structure

```
DE-SecurityIndex/
├── docker-compose.yml          # All services orchestration
├── docker/
│   └── minio/
│       └── init.sh             # Bucket creation + data distribution
├── data/                       # Pre-downloaded source data (mount into MinIO)
│   ├── vnexpress/
│   │   ├── data.json           # Raw scraped data
│   │   ├── data-clean.json     # Cleaned data
│   │   └── data-clean-report.json
│   └── soha/
│       └── ...
├── dags/                       # Airflow DAG definitions
├── logs/                       # Airflow logs (auto-generated)
├── spark-jobs/                 # PySpark job scripts
├── backend/                    # API backend (Node.js)
└── frontend/                   # Dashboard frontend (Vite + React)
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- 8GB+ RAM recommended

### 1. Place data

Put JSON source data into `data/` organized by source name:

```
data/{source_name}/data.json          # raw
data/{source_name}/data-clean.json    # cleaned
```

### 2. Start services

```bash
docker compose up -d
```

### 3. Verify

```bash
docker compose ps                  # All containers healthy
docker compose logs minio-init     # Check data distribution
```

### 4. Access UIs

| Service | URL | Credentials |
|---------|-----|-------------|
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |
| Spark Master | http://localhost:8081 | - |
| Airflow | http://localhost:8080 | airflow / airflow |
| Unity Catalog | http://localhost:8181 | - |

### 5. Stop

```bash
docker compose down        # Stop services (keep data)
docker compose down -v     # Stop + delete all volumes
```

## MinIO Bucket Structure (Medallion Layers)

```
raw-landing/    ← Raw source data (data.json per source)
bronze/         ← Cleaned data ready for processing (data-clean.json per source)
silver/         ← Normalized/deduplicated (empty, for later)
gold/           ← Aggregated analytics-ready (empty, for later)
```

## Data Flow

```text
data/ (host) → minio-init → raw-landing/ (raw) + bronze/ (clean)
                             ↓ (PySpark: silver_pipeline.py)
                             silver/ (3NF Delta Tables) → gold/ (future) → Dashboard
```

## Silver Layer Setup & Execution

The Silver Layer transforms and normalizes the parsed JSON files from the Bronze layer into queryable 3NF Delta Lake tables within the `s3a://silver/` bucket. 

### 1. Schema Overview
The pipeline generates the following Delta tables using Spark SQL `UPSERT` capabilities:
* **`dim_sources`**: Identifies data origins (e.g., vnexpress, soha).
* **`dim_incident_categories`**: Maps categorical groupings (e.g., Traffic Accident, Fire).
* **`dim_administrative_units`**: Hierarchical dimension mapping granular locations (District → City).
* **`fact_extracted_incidents`**: Center transaction table containing the standardized `event_timestamp`, dimensional keys, confidence weights, and direct URLs for lineage tracing.

* **`quality_audit_log`**: Logs the quality audit metrics for the Bronze layer data.

### 2. Manual Execution (Spark Master)
To manually execute the normalization pipeline that reads from Bronze and writes to Silver:
```bash
docker exec spark-master-de /opt/spark/bin/spark-submit /opt/spark/jobs/silver_pipeline.py
```

### 3. Verification & Querying
To verify referential integrity or visually inspect the integrated 3NF schema, we have provided a query script that reads the created tables directly from the MinIO `silver` bucket:
```bash
docker exec spark-master-de /opt/spark/bin/spark-submit /opt/spark/jobs/query_silver.py
```


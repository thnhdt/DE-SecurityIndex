"""
Silver Layer Pipeline

Reads bronze data from MinIO buckets (vnexpress, soha), cleanses it,
and upserts into 3NF Silver Delta tables in MinIO (s3a://silver/).
"""
import os
from pyspark.sql import SparkSession
from pyspark.sql.functions import (
    col, lit, md5, concat_ws, regexp_extract, to_timestamp, 
    trim, coalesce, split, when, isnull, sum as _sum
)
from pyspark.sql import Row

def get_spark_session():
    # Note: Spark configurations (MinIO endpoint, access keys, Delta jars) 
    # are assumed to be loaded via spark-defaults.conf based on user's note.
    return SparkSession.builder \
        .appName("SilverLayerPipeline") \
        .getOrCreate()

def get_merge_logic(spark, df, path, merge_condition):
    """
    Helper to apply Delta MERGE INTO.
    Creates the table if it does not exist.
    We use Spark SQL since delta-spark Python wrapper might not be installed.
    """
    # Check if delta table exists by attempting to read it
    table_exists = False
    try:
        spark.read.format("delta").load(path).limit(1).count()
        table_exists = True
    except Exception:
        table_exists = False

    if not table_exists:
        df.write.format("delta").mode("overwrite").save(path)
    else:
        df.createOrReplaceTempView("src")
        spark.sql(f"""
            MERGE INTO delta.`{path}` AS tgt
            USING src
            ON {merge_condition}
            WHEN MATCHED THEN UPDATE SET *
            WHEN NOT MATCHED THEN INSERT *
        """)

def main():
    spark = get_spark_session()

    print("=" * 60)
    print("1. Reading Bronze Data from MinIO...")
    # Read from both buckets based on user specification.
    input_paths = [
        "s3a://bronze/soha/data-clean.json",
        "s3a://bronze/vnexpress/data-clean.json"
    ]
    
    raw_df = spark.read.option("multiLine", "true").json(input_paths)
    raw_count = raw_df.count()
    print(f"Total bronze records read: {raw_count}")

    print("=" * 60)
    print("2. Data Cleansing & Deduplication")
    
    # --- QUALITY AUDIT: Measure noise before correction ---
    audit_metrics = raw_df.select(
        _sum(when(isnull(col("timestamp")) | (trim(col("timestamp")) == ""), 1).otherwise(0)).alias("missing_timestamps"),
        _sum(when(isnull(col("city")) | (trim(col("city")) == ""), 1).otherwise(0)).alias("missing_cities"),
        _sum(when(isnull(col("district")) | (trim(col("district")) == ""), 1).otherwise(0)).alias("missing_districts")
    ).collect()[0].asDict()
    
    # Cleanse Timestamp
    date_str = regexp_extract(col("timestamp"), r"(\d{1,2}/\d{1,2}/\d{4})", 1)
    time_str = regexp_extract(col("timestamp"), r"(\d{1,2}:\d{2})", 1)
    datetime_str = concat_ws(" ", date_str, time_str)
    
    cleaned_df = raw_df \
        .withColumn("event_timestamp", to_timestamp(datetime_str, "d/M/yyyy H:mm")) \
        .withColumn("title", trim(col("title"))) \
        .withColumn("summary", trim(col("summary"))) \
        .withColumn("source", coalesce(trim(col("source")), lit("unknown"))) \
        .withColumn("label", coalesce(trim(col("label")), lit("Uncategorized"))) \
        .withColumn("city", coalesce(trim(col("city")), lit("Unknown"))) \
        .withColumn("district", coalesce(trim(col("district")), lit("Unknown"))) \
        .withColumn("confidence_score", col("confidence").cast("float"))
    
    cleaned_df = cleaned_df.dropDuplicates(["id"])
    dedup_count = cleaned_df.count()
    
    audit_metrics["duplicates_dropped"] = raw_count - dedup_count
    audit_metrics["total_processed"] = raw_count

    # Base Path for Silver layer
    SILVER_BASE = "s3a://silver"

    print("=" * 60)
    print("3. Building & Upserting Dim_Sources")
    dim_sources = cleaned_df.select("source").distinct() \
        .withColumn("source_id", md5(col("source"))) \
        .withColumn("source_name", col("source")) \
        .withColumn("source_type", lit("News")) \
        .select("source_id", "source_name", "source_type")
    
    get_merge_logic(spark, dim_sources, f"{SILVER_BASE}/dim_sources", "tgt.source_id = src.source_id")

    print("=" * 60)
    print("4. Building & Upserting Dim_Incident_Categories")
    dim_categories = cleaned_df.select("label").distinct() \
        .withColumn("category_id", md5(col("label"))) \
        .withColumn("category_name", col("label")) \
        .withColumn("severity_weight", lit(1)) \
        .select("category_id", "category_name", "severity_weight")
    
    get_merge_logic(spark, dim_categories, f"{SILVER_BASE}/dim_incident_categories", "tgt.category_id = src.category_id")

    print("=" * 60)
    print("5. Building & Upserting Dim_Administrative_Units")
    # Extract City
    cities_df = cleaned_df.select("city").distinct() \
        .withColumn("unit_id", md5(col("city"))) \
        .withColumn("unit_name", col("city")) \
        .withColumn("unit_level", lit("City")) \
        .withColumn("parent_unit_id", lit(None).cast("string"))

    # Extract District
    districts_df = cleaned_df.select("city", "district").distinct() \
        .withColumn("unit_id", md5(concat_ws("-", col("city"), col("district")))) \
        .withColumn("unit_name", col("district")) \
        .withColumn("unit_level", lit("District")) \
        .withColumn("parent_unit_id", md5(col("city")))
    
    dim_admin_cols = ["unit_id", "unit_name", "unit_level", "parent_unit_id"]
    dim_admin_units = cities_df.select(*dim_admin_cols).union(districts_df.select(*dim_admin_cols)).distinct()

    get_merge_logic(spark, dim_admin_units, f"{SILVER_BASE}/dim_administrative_units", "tgt.unit_id = src.unit_id")

    print("=" * 60)
    print("6. Building & Upserting Fact_Extracted_Incidents")
    fact_incidents = cleaned_df \
        .withColumn("incident_id", col("id")) \
        .withColumn("source_id", md5(col("source"))) \
        .withColumn("category_id", md5(col("label"))) \
        .withColumn("city_unit_id", md5(col("city"))) \
        .withColumn("district_unit_id", md5(concat_ws("-", col("city"), col("district")))) \
        .withColumn("latitude", col("latitude").cast("decimal(10,8)") if "latitude" in cleaned_df.columns else lit(None).cast("decimal(10,8)")) \
        .withColumn("longitude", col("longitude").cast("decimal(11,8)") if "longitude" in cleaned_df.columns else lit(None).cast("decimal(11,8)")) \
        .select(
            "incident_id",
            "source_id",
            "category_id",
            "city_unit_id",
            "district_unit_id",
            "event_timestamp",
            "title",
            "summary",
            "confidence_score",
            "url",
            "latitude",
            "longitude"
        )
    
    get_merge_logic(spark, fact_incidents, f"{SILVER_BASE}/fact_extracted_incidents", "tgt.incident_id = src.incident_id")

    print("=" * 60)
    print("SUCCESS: Silver Layer Delta Tables Created/Updated!")
    print("Silver Fact Table row count: ", spark.read.format("delta").load(f"{SILVER_BASE}/fact_extracted_incidents").count())

    print("=" * 60)
    print("7. Quality Audit Log")
    for metric, value in audit_metrics.items():
        print(f" - {metric}: {value} records")
        
    # Save the audit log to Silver layer
    audit_df = spark.createDataFrame([Row(**audit_metrics)])
    audit_df.write.format("json").mode("overwrite").save(f"{SILVER_BASE}/quality_audit_log")
    print(" -> Audit Report saved to s3a://silver/quality_audit_log")

    spark.stop()

if __name__ == "__main__":
    main()

"""
Gold Layer Pipeline

Reads silver table from MinIO buckets, deflatten data for consumer layer,
and upserts into star schema tables and flat tables in MinIO (s3a://gold/).
"""

from pyspark.sql import SparkSession, Row
from pyspark.sql.functions import (
    col, avg, md5, concat_ws, regexp_extract, to_timestamp, 
    trim, coalesce, split, when, isnull, sum as _sum,
    dayofweek, hour, day, month, year, date_format, count
)

def get_spark_session():
    return SparkSession.builder.appName("GoldLayerPipeline").getOrCreate()

def upsert_to_delta(spark, df, path, merge_condition):
    try:
        spark.read.format("delta").load(path).limit(1).count()
        table_exists = True
    except:
        table_exists = False

    if not table_exists:
        df.write.format("delta").mode("overwrite").save(path)
    else:
        df.createOrReplaceTempView("gold_updates")
        spark.sql(f"""
            MERGE INTO delta.`{path}` AS target
            USING gold_updates AS updates
            ON {merge_condition}
            WHEN MATCHED THEN UPDATE SET *
            WHEN NOT MATCHED THEN INSERT *
        """)
def main():
    # Extract & Pre-process Silver Tables
        ## Time Extraction: event_timestamp -> day, month, year, isWeekend
        ## Apply logic to calculate security_score_contribution
    spark = get_spark_session()
    SILVER_BASE = "s3a://silver"
    GOLD_BASE = "s3a://gold"
    print("=" * 60)
    print("1. Reading Silver Data from MinIO...")
    fact_extracted_incidents = spark.read.format("delta").load(f"{SILVER_BASE}/fact_extracted_incidents")
    dim_sources = spark.read.format("delta").load(f"{SILVER_BASE}/dim_sources")
    dim_incident_categories = spark.read.format("delta").load(f"{SILVER_BASE}/dim_incident_categories")
    dim_administrative_units = spark.read.format("delta").load(f"{SILVER_BASE}/dim_administrative_units")

    # Denormalize Dimensions (Flattening)
        ## Dim_Location: Join Administrative_Units with itself (Parent-Child join) to create a single row that contains [Ward, District, City].
        ## Dim_Incident: Simply select the relevant columns from your Silver Incident_Categories table.
    print("=" * 60)
    print("2. Create dim_location by de-normalize dim_administrative_units")
    districts = dim_administrative_units.filter(col("unit_level") == "District").alias("d")
    cities = dim_administrative_units.filter(col("unit_level") == "City").alias("c")
    dim_location_gold = districts.join(
        cities, col("d.parent_unit_id") == col("c.unit_id"), "left"
    ).select(
        col("d.unit_id").alias("location_key"),
        col("d.unit_name").alias("district_name"),
        col("c.unit_name").alias("city_name")
    )

    print("=" * 60)
    print("3. Creating dim_time...")
    dim_time_gold = fact_extracted_incidents.select("event_timestamp").distinct() \
        .withColumn("time_key", md5(col("event_timestamp").cast("string"))) \
        .withColumn("hour", hour(col("event_timestamp"))) \
        .withColumn("day", day(col("event_timestamp"))) \
        .withColumn("month", month(col("event_timestamp"))) \
        .withColumn("year", year(col("event_timestamp"))) \
        .withColumn("is_weekend", when(date_format(col("event_timestamp"), "E").isin("Sat", "Sun"), True).otherwise(False))

    print("=" * 60)
    print("4. Creating dim_incident...")
    dim_incident_gold = dim_incident_categories.select(
        col("category_id").alias("incident_key"),
        col("category_name"),
        col("severity_weight")
    )
    # Build the Fact_Security_Events (The Core)
        ## Join Everything: Join Silver Extracted_Incidents with newly created Dim_Location and Dim_Time.
        ## Key Generation: Use md5 or monotonically_increasing_id to create the time_key and location_key if they aren't already unique.
        ## Save Path: s3a://gold/fact_security_events/
    print("=" * 60)
    print("5. Building Fact_Security_Events (Star Schema)...")
    fact_security_events = fact_extracted_incidents.alias("f") \
        .join(dim_incident_categories.alias("cat"), col("f.category_id") == col("cat.category_id")) \
        .withColumn("security_score_contribution", col("cat.severity_weight") * col("f.confidence_score")) \
        .select(
            col("f.incident_id").alias("event_id"),
            md5(col("f.event_timestamp").cast("string")).alias("time_key"),
            col("f.district_unit_id").alias("location_key"),
            col("f.category_id").alias("incident_key"),
            col("f.latitude").alias("lat"),
            col("f.longitude").alias("lon"),
            "security_score_contribution"
        )
    # Save Star Schema tables
    upsert_to_delta(spark, dim_location_gold, f"{GOLD_BASE}/dim_location", "target.location_key = updates.location_key")
    upsert_to_delta(spark, dim_time_gold, f"{GOLD_BASE}/dim_time", "target.time_key = updates.time_key")
    upsert_to_delta(spark, dim_incident_gold, f"{GOLD_BASE}/dim_incident", "target.incident_key = updates.incident_key")
    upsert_to_delta(spark, fact_security_events, f"{GOLD_BASE}/fact_security_events", "target.event_id = updates.event_id")

    print("=" * 60)
    print("6. Generating gold_flat_hotspots (Real-time Map Ready)...")
    hotspots = fact_extracted_incidents.alias("f") \
        .join(dim_incident_categories.alias("cat"), "category_id") \
        .join(dim_location_gold.alias("loc"), col("f.district_unit_id") == col("loc.location_key")) \
        .select(
            col("f.incident_id"),
            col("f.event_timestamp").alias("event_time"),
            "district_name",
            col("cat.category_name").alias("incident_type"),
            "severity_weight",
            col("f.latitude").alias("lat"),  
            col("f.longitude").alias("lon")  
        )
    upsert_to_delta(spark, hotspots, f"{GOLD_BASE}/gold_flat_hotspots", "target.incident_id = updates.incident_id")

    print("=" * 60)
    print("7. Generating gold_security_index (Chart ready)...")
    hourly_security_index = hotspots.groupBy(
        date_format(col("event_time"), "yyyy-MM-dd HH:00:00").alias("calculation_hour"),
        "district_name"
    ).agg(
        count("*").alias("total_incidents"),
        avg(col("severity_weight") * 10).alias("security_score")
    ).withColumn("status_label",
                 when(col("security_score") < 30, "Safe")
                 .when(col("security_score") < 70, "Warning")
                 .otherwise("Dangerouse")
    )

    upsert_to_delta(spark, hourly_security_index, f"{GOLD_BASE}/gold_hourly_security_index", 
                "target.calculation_hour = updates.calculation_hour AND target.district_name = updates.district_name")
    spark.stop()
    print("SUCCESS: Gold Layer Tables created/updated")
if __name__ == "__main__":
    main()


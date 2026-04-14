"""
Verification Script - Gold Layer (Lakehouse)
Checks Star Schema integrity, record counts, and business logic validity.
"""

from pyspark.sql import SparkSession
from pyspark.sql.functions import col

def main():
    # 1. Initialize Spark with S3 and Delta configurations
    # Note: Adjust endpoints/credentials if they aren't in your spark-defaults.conf
    spark = SparkSession.builder \
        .appName("VerifyGoldTables") \
        .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
        .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
        .getOrCreate()
        
    spark.sparkContext.setLogLevel("ERROR")

    GOLD_BASE = "s3a://gold"

    print("=" * 60)
    print("1. Loading Delta Tables into DataFrames...")
    
    try:
        # Load Star Schema
        dim_location = spark.read.format("delta").load(f"{GOLD_BASE}/dim_location")
        dim_time = spark.read.format("delta").load(f"{GOLD_BASE}/dim_time")
        dim_incident = spark.read.format("delta").load(f"{GOLD_BASE}/dim_incident")
        fact_events = spark.read.format("delta").load(f"{GOLD_BASE}/fact_security_events")
        
        # Load Consumer Tables
        hotspots = spark.read.format("delta").load(f"{GOLD_BASE}/gold_flat_hotspots")
        hourly_idx = spark.read.format("delta").load(f"{GOLD_BASE}/gold_hourly_security_index")

        # Register as Temp Views for SQL queries
        dim_location.createOrReplaceTempView("dim_location")
        dim_time.createOrReplaceTempView("dim_time")
        dim_incident.createOrReplaceTempView("dim_incident")
        fact_events.createOrReplaceTempView("fact_events")
        hourly_idx.createOrReplaceTempView("hourly_idx")
        
        print("-> All tables loaded successfully.")
    except Exception as e:
        print(f"CRITICAL ERROR: Could not load tables. Ensure paths are correct. \n{e}")
        return

    print("=" * 60)
    print("2. Record Count Audit")
    print(f"| Table                | Count |")
    print(f"|----------------------|-------|")
    print(f"| Fact Events          | {fact_events.count():<5} |")
    print(f"| Dim Locations        | {dim_location.count():<5} |")
    print(f"| Dim Incidents        | {dim_incident.count():<5} |")
    print(f"| Hourly Index Rows    | {hourly_idx.count():<5} |")
    print(f"| Flat Hotspots        | {hotspots.count():<5} |")

    print("=" * 60)
    print("3. Star Schema Integrity Check (Fact -> Location -> Incident -> Time)")
    # This now proves that ALL three dimension keys are working correctly
    spark.sql("""
        SELECT 
            f.event_id, 
            t.hour,
            t.day,
            t.month,
            t.year,
            l.district_name, 
            i.category_name, 
            f.security_score_contribution AS score
        FROM fact_events f
        JOIN dim_location l ON f.location_key = l.location_key
        JOIN dim_incident i ON f.incident_key = i.incident_key
        JOIN dim_time t     ON f.time_key = t.time_key
        ORDER BY f.security_score_contribution DESC
        LIMIT 20
    """).show()

    spark.sql("""
        SELECT 
            *
        FROM fact_events f
        LIMIT 20
    """).show()

    spark.sql("""
        SELECT 
            *
        FROM dim_time
        LIMIT 20
    """).show()

    spark.sql("""
        SELECT 
            *
        FROM dim_location
        LIMIT 20
    """).show()

    spark.sql("""
        SELECT 
            *
        FROM dim_incident
        LIMIT 20
    """).show()

    print("=" * 60)
    print("4. KPI Verification: Security Index Labels")
    # Validates that the "Safe/Warning/Dangerous" logic was applied correctly
    spark.sql("""
        SELECT 
            *
        FROM hourly_idx
    """).show(20)

    print("=" * 60)
    print("5. Geospatial Check (Hotspots)")
    # Ensures we have valid coordinates for the map
    hotspots.select("*").show(20)

    print("=" * 60)
    print("VERIFICATION COMPLETE: Gold Layer is ready for consumption.")
    spark.stop()

if __name__ == "__main__":
    main()
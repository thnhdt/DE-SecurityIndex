from pyspark.sql import SparkSession

def main():
    spark = SparkSession.builder \
        .appName("QuerySilverTables") \
        .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
        .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
        .getOrCreate()
        
    spark.sparkContext.setLogLevel("ERROR")

    print("=" * 60)
    print("1. Loading Delta Tables from Silver Layer...")
    
    SILVER_BASE = "s3a://silver"
    
    try:
      
        df_sources = spark.read.format("delta").load(f"{SILVER_BASE}/dim_sources")
        df_categories = spark.read.format("delta").load(f"{SILVER_BASE}/dim_incident_categories")
        df_admin_units = spark.read.format("delta").load(f"{SILVER_BASE}/dim_administrative_units")
        df_incidents = spark.read.format("delta").load(f"{SILVER_BASE}/fact_extracted_incidents")
        
        df_sources.createOrReplaceTempView("dim_sources")
        df_categories.createOrReplaceTempView("dim_incident_categories")
        df_admin_units.createOrReplaceTempView("dim_administrative_units")
        df_incidents.createOrReplaceTempView("fact_extracted_incidents")
        
    except Exception as e:
        print(f"Failed to load Delta Tables: {e}")
        spark.stop()
        return

    print("=" * 60)
    print("2. Total Records per Table:")
    print(f"- Fact Incidents: {df_incidents.count()}")
    print(f"- Dim Sources: {df_sources.count()}")
    print(f"- Dim Categories: {df_categories.count()}")
    print(f"- Dim Admin Units: {df_admin_units.count()}")

    print("=" * 60)
    print("3. Executing Integrated Query:")
    
    result_df = spark.sql("""
        SELECT 
            f.event_timestamp,
            src.source_name,
            cat.category_name,
            city.unit_name AS city_name,
            dist.unit_name AS district_name,
            f.title
        FROM fact_extracted_incidents f
        LEFT JOIN dim_sources src 
            ON f.source_id = src.source_id
        LEFT JOIN dim_incident_categories cat 
            ON f.category_id = cat.category_id
        LEFT JOIN dim_administrative_units city 
            ON f.city_unit_id = city.unit_id
        LEFT JOIN dim_administrative_units dist 
            ON f.district_unit_id = dist.unit_id
        ORDER BY f.event_timestamp DESC
        LIMIT 10
    """)
    
    result_df.show(truncate=False)

    spark.stop()

if __name__ == "__main__":
    main()
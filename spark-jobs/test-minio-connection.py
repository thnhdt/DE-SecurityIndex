"""Test Spark ↔ MinIO connection with Delta Lake read/write."""
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("TestMinIOConnection") \
    .getOrCreate()

# Step 1: Read JSON from MinIO bronze bucket
print("=" * 60)
print("Reading JSON from s3a://bronze/vnexpress/data-clean.json...")
df = spark.read.option("multiLine", "true").json("s3a://bronze/vnexpress/data-clean.json")
print(f"Schema:")
df.printSchema()
print(f"Row count: {df.count()}")

# Step 2: Write as Delta table
print("=" * 60)
print("Writing Delta table to s3a://bronze/vnexpress/delta/...")
df.write.format("delta").mode("overwrite").save("s3a://bronze/vnexpress/delta/")
print("Delta write complete.")

# Step 3: Read back Delta table to verify
print("=" * 60)
print("Reading Delta table back...")
df_delta = spark.read.format("delta").load("s3a://bronze/vnexpress/delta/")
print(f"Delta table row count: {df_delta.count()}")
print("=" * 60)
print("SUCCESS: Spark ↔ MinIO + Delta Lake integration verified!")

spark.stop()

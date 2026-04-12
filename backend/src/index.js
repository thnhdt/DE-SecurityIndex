const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const app = express();
// Note: Changed default to 3001 to match your Vite proxy settings
const PORT = process.env.PORT || 3001; 

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: false,
  })
);
app.use(express.json());

// --- Delta Lake / MinIO Configuration ---
const storageOptions = {
  "endpoint": process.env.MINIO_ENDPOINT || "http://localhost:9000",
  "access_key_id": process.env.MINIO_ACCESS_KEY || "minioadmin",
  "secret_access_key": process.env.MINIO_SECRET_KEY || "minioadmin",
  "region": "us-east-1",
  "allow_http": "true", // Required for local MinIO without SSL
  "s3_url_style": "path"
};

const GOLD_BASE = "s3a://gold";

// --- API Routes ---
const apiRouter = express.Router();

apiRouter.get("/", (req, res) => {
  res.json({ message: "API connected successfully" });
});


app.use("/api", apiRouter);
app.use("/api/hotspots", require("./route/hotSpots.route"));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
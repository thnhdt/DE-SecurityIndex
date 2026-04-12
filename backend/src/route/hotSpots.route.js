const express = require("express");
const router = express.Router();
const hotSpotsController = require("../controller/hotSpots.controller");

router.get("/all", hotSpotsController.getAllHotspotsData);
router.get("/range", hotSpotsController.getHotspotdataByTimeRange);

module.exports = router;

const express = require("express");
const router = express.Router();
const securityController = require("../controller/security.controller");

router.get("/hourly", securityController.getHourlySecurityIndex);

module.exports = router;

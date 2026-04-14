const securityService = require("../service/security.service");

const getHourlySecurityIndex = async (req, res) => {
  try {
    const data = await securityService.getHourlySecurityIndex();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getHourlySecurityIndex };

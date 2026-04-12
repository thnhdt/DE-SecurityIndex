const hotSpotsService = require("../service/hotSpots.service");

const getAllHotspotsData = async (req, res) => {
  try {
    const data = await hotSpotsService.getAllHotspotsData();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getHotspotdataByTimeRange = async (req, res) => {
  const { startTime, endTime } = req.query;
  if(!startTime || !endTime) {
    return res.status(400).json({
      success: false,
      message: "Please provide both startTime and endTime parameters"
    })
  }
  try {
    const data = await hotSpotsService.getHotspotdataByTimeRange(startTime, endTime);
    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

const getHotspotdataByType = async (req, res) => {
  const { type } = req.query;
  if(!type) {
    return res.status(400).json({
      success: false,
      message: "Please provide type parameter"
    })
  }
  try {
    const data = await hotSpotsService.getHostspotdataByType(type);
    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { getAllHotspotsData, getHotspotdataByTimeRange, getHotspotdataByType };
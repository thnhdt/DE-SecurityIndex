export const Gold_Flat_Hotspots = [
  { event_id: 1, event_time: "2026-04-05 08:00", district_name: "Quận 1", incident_type: "Tai nạn giao thông", severity_weight: 4, lat: 10.7769, lon: 106.7009 },
  { event_id: 2, event_time: "2026-04-05 09:30", district_name: "Quận 3", incident_type: "Cướp giật", severity_weight: 5, lat: 10.7873, lon: 106.6876 },
  { event_id: 3, event_time: "2026-04-05 10:15", district_name: "Quận 5", incident_type: "Hỏa hoạn", severity_weight: 5, lat: 10.7551, lon: 106.6564 },
  { event_id: 4, event_time: "2026-04-05 11:00", district_name: "Quận 7", incident_type: "Tai nạn giao thông", severity_weight: 3, lat: 10.7415, lon: 106.7315 },
  { event_id: 5, event_time: "2026-04-05 12:30", district_name: "Quận 1", incident_type: "Trộm cắp", severity_weight: 3, lat: 10.7830, lon: 106.6930 },
  { event_id: 6, event_time: "2026-04-05 13:00", district_name: "Quận 10", incident_type: "Tai nạn giao thông", severity_weight: 4, lat: 10.7792, lon: 106.6669 },
  { event_id: 7, event_time: "2026-04-05 14:00", district_name: "Bình Thạnh", incident_type: "Hỏa hoạn", severity_weight: 4, lat: 10.8071, lon: 106.7083 },
  { event_id: 8, event_time: "2026-04-05 15:00", district_name: "Quận 3", incident_type: "Cướp giật", severity_weight: 5, lat: 10.7915, lon: 106.6850 },
  { event_id: 9, event_time: "2026-04-05 15:30", district_name: "Phú Nhuận", incident_type: "Trộm cắp", severity_weight: 2, lat: 10.8000, lon: 106.6800 },
  { event_id: 10, event_time: "2026-04-05 16:00", district_name: "Quận 1", incident_type: "Tai nạn giao thông", severity_weight: 3, lat: 10.7750, lon: 106.6950 },
  { event_id: 11, event_time: "2026-04-04 08:00", district_name: "Quận 5", incident_type: "Tai nạn giao thông", severity_weight: 4, lat: 10.7500, lon: 106.6600 },
  { event_id: 12, event_time: "2026-04-04 09:00", district_name: "Quận 7", incident_type: "Hỏa hoạn", severity_weight: 5, lat: 10.7400, lon: 106.7350 },
  { event_id: 13, event_time: "2026-04-04 10:00", district_name: "Bình Thạnh", incident_type: "Trộm cắp", severity_weight: 3, lat: 10.8100, lon: 106.7100 },
  { event_id: 14, event_time: "2026-04-04 11:00", district_name: "Quận 10", incident_type: "Cướp giật", severity_weight: 4, lat: 10.7800, lon: 106.6650 },
  { event_id: 15, event_time: "2026-04-04 12:00", district_name: "Quận 3", incident_type: "Tai nạn giao thông", severity_weight: 3, lat: 10.7850, lon: 106.6880 },
];

export const Gold_Hourly_Security_Index = [
  { calculation_hour: "06:00", district_name: "Quận 1", total_incidents: 2, security_score: 9.2, status_label: "Safe" },
  { calculation_hour: "07:00", district_name: "Quận 1", total_incidents: 5, security_score: 8.5, status_label: "Warning" },
  { calculation_hour: "08:00", district_name: "Quận 1", total_incidents: 8, security_score: 7.8, status_label: "Warning" },
  { calculation_hour: "09:00", district_name: "Quận 1", total_incidents: 6, security_score: 8.2, status_label: "Warning" },
  { calculation_hour: "10:00", district_name: "Quận 1", total_incidents: 4, security_score: 8.8, status_label: "Safe" },
  { calculation_hour: "11:00", district_name: "Quận 1", total_incidents: 3, security_score: 9.0, status_label: "Safe" },
  { calculation_hour: "12:00", district_name: "Quận 1", total_incidents: 7, security_score: 7.5, status_label: "Warning" },
  { calculation_hour: "13:00", district_name: "Quận 1", total_incidents: 5, security_score: 8.4, status_label: "Warning" },
  { calculation_hour: "14:00", district_name: "Quận 1", total_incidents: 9, security_score: 7.2, status_label: "Danger" },
  { calculation_hour: "15:00", district_name: "Quận 1", total_incidents: 6, security_score: 8.0, security_score_label: "Warning" },
  { calculation_hour: "16:00", district_name: "Quận 1", total_incidents: 4, security_score: 8.6, status_label: "Warning" },
];

export const districtList = [
  "Quận 1", "Quận 3", "Quận 5", "Quận 7", "Quận 10", 
  "Bình Thạnh", "Phú Nhuận", "Gò Vấp", "Tân Bình", "Tân Phú"
];

export const incidentTypes = [
  "Tai nạn giao thông",
  "Cướp giật",
  "Hỏa hoạn",
  "Trộm cắp",
  "Xâm phạm tài sản",
];

export const severityConfig = {
  1: { color: 'success', label: 'Thấp' },
  2: { color: 'default', label: 'Bình thường' },
  3: { color: 'warning', label: 'Cảnh báo' },
  4: { color: 'error', label: 'Nguy hiểm' },
  5: { color: 'magenta', label: 'Nghiêm trọng' },
};

export const incidentIcons = {
  "Tai nạn giao thông": "🚗",
  "Cướp giật": "🔓",
  "Hỏa hoạn": "🔥",
  "Trộm cắp": "🦹",
  "Xâm phạm tài sản": "🏠",
};
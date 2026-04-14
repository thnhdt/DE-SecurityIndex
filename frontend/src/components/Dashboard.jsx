import { useState, useEffect } from "react";
import axiosClient from "../api/axiosClient";
import Map from "./Map";

const DISTRICT_COORDS = {
  "Quận 1": { lat: 10.7769, lng: 106.6923 },
  "Quận 3": { lat: 10.7868, lng: 106.6878 },
  "Quận 4": { lat: 10.7658, lng: 106.6869 },
  "Quận 5": { lat: 10.7581, lng: 106.6791 },
  "Quận 6": { lat: 10.7501, lng: 106.6710 },
  "Quận 7": { lat: 10.7425, lng: 106.7146 },
  "Quận 8": { lat: 10.7391, lng: 106.6563 },
  "Quận 9": { lat: 10.8171, lng: 106.8358 },
  "Quận 10": { lat: 10.7812, lng: 106.6703 },
  "Quận 11": { lat: 10.7673, lng: 106.6606 },
  "Quận 12": { lat: 10.8586, lng: 106.6365 },
  "Bình Tân": { lat: 10.7863, lng: 106.5674 },
  "Bình Thạnh": { lat: 10.8038, lng: 106.7118 },
  "Gò Vấp": { lat: 10.8386, lng: 106.6669 },
  "Phú Nhuận": { lat: 10.7969, lng: 106.6934 },
  "Tân Bình": { lat: 10.7958, lng: 106.6660 },
  "Tân Phú": { lat: 10.7796, lng: 106.6364 },
  "Thủ Đức": { lat: 10.8418, lng: 106.7516 },
  "Bình Chánh": { lat: 10.9121, lng: 106.5134 },
  "Cần Giờ": { lat: 10.6403, lng: 106.7650 },
  "Củ Chi": { lat: 11.0978, lng: 106.4898 },
  "Hóc Môn": { lat: 10.9048, lng: 106.5970 },
  "Nhà Bè": { lat: 10.7386, lng: 106.7501 },
};

const INCIDENT_TYPE_MAP = {
  "Public Disorder": "Trật tự công cộng",
  "Traffic Jam": "Kẹt xe",
  "Traffic Accident": "Tai nạn giao thông",
  "Fire": "Hỏa hoạn",
  "Crime": "Tội phạm",
};

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeThreats: 0,
    securityScore: 0,
    incidents: 0,
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [hotspots, setHotspots] = useState([]);
  const [filterType, setFilterType] = useState("");
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_APP_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await axiosClient.get("/");
        setMessage(data.message);
      } catch {
        setMessage("Cannot connect to backend");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    setStats({
      totalUsers: 1234,
      activeThreats: 7,
      securityScore: 86,
      incidents: 23,
    });
  }, []);

  useEffect(() => {
    const fetchHotspots = async () => {
      try {
        const url = filterType
          ? `/hotspots/type?type=${filterType}`
          : "/hotspots/all";
        console.log("Fetching:", url);
        const data = await axiosClient.get(url);
        console.log("Data:", data);
        setHotspots(data.success ? data.data : []);
      } catch (err) {
        console.error("Failed to fetch hotspots:", err);
        setHotspots([]);
      }
    };

    fetchHotspots();
  }, [filterType]);

  const getMarkerPosition = (hotspot) => {
    if (hotspot.lat && hotspot.lon) {
      return { lat: parseFloat(hotspot.lat), lng: parseFloat(hotspot.lon) };
    }

    const districtName = hotspot.district_name || "";
    const districtKey = Object.keys(DISTRICT_COORDS).find(key =>
      districtName.includes(key)
    );

    if (districtKey) {
      const base = DISTRICT_COORDS[districtKey];
      return {
        lat: base.lat + (Math.random() - 0.5) * 0.03,
        lng: base.lng + (Math.random() - 0.5) * 0.03,
      };
    }
    return { lat: 10.7769, lng: 106.6923 };
  };

  const markers = hotspots.map((h, idx) => {
    const pos = getMarkerPosition(h);
    return {
      id: idx,
      lat: pos.lat,
      lng: pos.lng,
      title: INCIDENT_TYPE_MAP[h.incident_type] || h.incident_type || "Điểm nóng",
      label: h.incident_type?.charAt(0) || "H"
    };
  });

  const handleFilterChange = (e) => {
    setFilterType(e.target.value);
  };

  const cards = [
    { title: "Tổng người dùng", value: stats.totalUsers, color: "#4f46e5", icon: "👥" },
    { title: "Mối đe dọa", value: stats.activeThreats, color: "#dc2626", icon: "⚠️" },
    { title: "An toàn", value: `${stats.securityScore}%`, color: "#16a34a", icon: "🛡️" },
    { title: "Sự cố", value: stats.incidents, color: "#ca8a04", icon: "📊" },
  ];

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Bảng điều khiển an ninh</h1>
        <p className="status">
          Trạng thái API: <span className={message.includes("Cannot") ? "offline" : "online"}>
            {message}
          </span>
        </p>
      </header>

      <div className="cards-grid">
        {cards.map((card) => (
          <div key={card.title} className="card" style={{ borderLeftColor: card.color }}>
            <div className="card-icon">{card.icon}</div>
            <div className="card-info">
              <p className="card-title">{card.title}</p>
              <p className="card-value">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="hotspots-section">
        <h2>Bản đồ điểm nóng an ninh</h2>
        <div className="filter-controls">
          <label>Lọc theo loại: </label>
          <select value={filterType} onChange={handleFilterChange}>
            <option value="">Tất cả</option>
            <option value="Public Disorder">Trật tự công cộng</option>
            <option value="Traffic Jam">Kẹt xe</option>
            <option value="Traffic Accident">Tai nạn giao thông</option>
            <option value="Fire">Hỏa hoạn</option>
            <option value="Crime">Tội phạm</option>
          </select>
          <span className="hotspot-count">{markers.length} điểm nóng</span>
        </div>
        <Map
          apiKey={GOOGLE_MAPS_API_KEY}
          markers={markers}
          zoom={12}
          containerStyle={{ width: "100%", height: "400px", borderRadius: 8, border: "1px solid #eee" }}
        />
      </div>

      <div className="recent-activity">
        <h2>Hoạt động gần đây</h2>
        <table>
          <thead>
            <tr>
              <th>Sự kiện</th>
              <th>Mức độ</th>
              <th>Thời gian</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Cố gắng đăng nhập trái phép</td>
              <td><span className="badge danger">Cao</span></td>
              <td>2 phút trước</td>
              <td><span className="badge warning">Đang điều tra</span></td>
            </tr>
            <tr>
              <td>Cập nhật quy tắc tường lửa</td>
              <td><span className="badge success">Thấp</span></td>
              <td>15 phút trước</td>
              <td><span className="badge success">Đã xử lý</span></td>
            </tr>
            <tr>
              <td>Phát hiện malware trên server-02</td>
              <td><span className="badge danger">Nghiêm trọng</span></td>
              <td>1 giờ trước</td>
              <td><span className="badge warning">Đang xử lý</span></td>
            </tr>
            <tr>
              <td>Gia hạn chứng chỉ SSL</td>
              <td><span className="badge success">Thấp</span></td>
              <td>3 giờ trước</td>
              <td><span className="badge success">Đã xử lý</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

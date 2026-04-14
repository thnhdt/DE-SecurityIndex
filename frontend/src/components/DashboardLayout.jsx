import { useState, useMemo, useEffect } from 'react';
import { Layout, Space, Select, DatePicker, List, Card, Tag, Switch, Row, Col, Statistic, Typography, ConfigProvider } from 'antd';
import { FireOutlined } from '@ant-design/icons';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import MapSection from './MapSection';
import axiosClient from '../api/axiosClient';
import { Gold_Hourly_Security_Index, districtList, incidentTypes, incidentTypeLabels, severityConfig, incidentIcons } from '../data/mockData';

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

const { Header, Sider, Content } = Layout;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text } = Typography;

const getMarkerPosition = (hotspot) => {
  if (hotspot.lat && hotspot.lon) {
    return { lat: parseFloat(hotspot.lat), lng: parseFloat(hotspot.lon) };
  }
  const districtName = hotspot.district_name || "";
  const districtKey = Object.keys(DISTRICT_COORDS).find(key => districtName.includes(key));
  if (districtKey) {
    const base = DISTRICT_COORDS[districtKey];
    return {
      lat: base.lat + (Math.random() - 0.5) * 0.03,
      lng: base.lng + (Math.random() - 0.5) * 0.03,
    };
  }
  return { lat: 10.7769, lng: 106.6923 };
};

const formatEventTime = (eventTime) => {
  if (!eventTime || eventTime === 0) return "N/A";
  let timeMs;
  if (eventTime > 9999999999999) {
    timeMs = Math.floor(eventTime / 1000000);
  } else if (eventTime > 9999999999) {
    timeMs = Math.floor(eventTime / 1000);
  } else {
    timeMs = eventTime;
  }
  const hours = Math.floor(timeMs / 3600000) % 24;
  const minutes = Math.floor((timeMs % 3600000) / 60000);
  const seconds = Math.floor((timeMs % 60000) / 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export default function DashboardLayout() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mapMode, setMapMode] = useState('hotspots');
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedIncidentType, setSelectedIncidentType] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchHotspots = async () => {
      try {
        const url = selectedIncidentType
          ? `/hotspots/type?type=${selectedIncidentType}`
          : "/hotspots/all";
        const data = await axiosClient.get(url);
        setHotspots(data.success ? data.data : []);
      } catch (err) {
        console.error("Failed to fetch hotspots:", err);
        setHotspots([]);
      }
    };
    fetchHotspots();
  }, [selectedIncidentType]);

  useEffect(() => {
    const fetchHourlyData = async () => {
      try {
        const data = await axiosClient.get("/security/hourly");
        setHourlyData(data.success ? data.data : []);
      } catch (err) {
        console.error("Failed to fetch hourly data:", err);
        setHourlyData([]);
      }
    };
    fetchHourlyData();
  }, []);

  const getIncidentLabel = (type) => incidentTypeLabels[type] || type;

  const filteredIncidents = useMemo(() => {
    return hotspots.filter(item => {
      if (selectedDistrict && !item.district_name?.includes(selectedDistrict)) return false;
      if (dateRange && dateRange[0] && dateRange[1]) {
        const itemDate = item.event_time_iso ? new Date(item.event_time_iso) : null;
        if (itemDate && (itemDate < dateRange[0].toDate() || itemDate > dateRange[1].toDate())) return false;
      }
      return true;
    });
  }, [hotspots, selectedDistrict, dateRange]);

  const incidentsWithCoords = useMemo(() => {
    return filteredIncidents.map(item => {
      const pos = getMarkerPosition(item);
      return { ...item, lat: pos.lat, lon: pos.lng };
    });
  }, [filteredIncidents]);

  const totalIncidents = filteredIncidents.length;
  const avgSecurityScore = hourlyData.length > 0 
    ? (hourlyData.reduce((sum, item) => sum + (parseFloat(item.security_score) || 0), 0) / hourlyData.length).toFixed(1)
    : 0;

  const incidentByType = useMemo(() => {
    const counts = {};
    filteredIncidents.forEach(item => {
      counts[item.incident_type] = (counts[item.incident_type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredIncidents]);

  const getSeverityTag = (severity) => {
    if (severity <= 1) return null;
    const config = severityConfig[severity] || severityConfig[2];
    return <Tag color={config.color}>{config.label}</Tag>;
  };

  const getStatusTag = (score) => {
    if (score >= 8.5) return <Tag color="success">An toàn</Tag>;
    if (score >= 7) return <Tag color="warning">Cảnh báo</Tag>;
    return <Tag color="error">Nguy hiểm</Tag>;
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
        },
      }}
    >
      <Layout className="dashboard-layout">
        <Header style={{ background: '#001529', padding: 0 }} className="dashboard-header">
          <div className="header-left">
            <FireOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
            <span className="header-logo">Urban Security Index</span>
          </div>
          <div className="header-right">
            <span className="header-time">
              {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </Header>

        <Layout>
          <Sider width={400} className="dashboard-sider" theme="light">
            <div className="sider-content">
              <div className="filter-section">
                <h4>Bộ lọc</h4>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Select
                    placeholder="Chọn Quận"
                    allowClear
                    style={{ width: '100%' }}
                    value={selectedDistrict}
                    onChange={setSelectedDistrict}
                  >
                    {districtList.map(d => <Option key={d} value={d}>{d}</Option>)}
                  </Select>
                  <Select
                    placeholder="Loại sự cố"
                    allowClear
                    style={{ width: '100%' }}
                    value={selectedIncidentType}
                    onChange={setSelectedIncidentType}
                  >
                    {incidentTypes.map(t => <Option key={t} value={t}>{incidentTypeLabels[t] || t}</Option>)}
                  </Select>
                  <RangePicker 
                    style={{ width: '100%' }}
                    onChange={setDateRange}
                  />
                </Space>
              </div>

              <div className="incident-list-section">
                <h4>Danh sách sự cố ({filteredIncidents.length})</h4>
                <List
                  dataSource={filteredIncidents}
                  renderItem={(item) => (
                    <Card size="small" className="incident-card">
                      <div className="incident-card-header">
                        <span className="incident-type">
                          {incidentIcons[item.incident_type]} {getIncidentLabel(item.incident_type)}
                        </span>
                        {getSeverityTag(item.severity_weight)}
                      </div>
                      <div className="incident-time">{formatEventTime(item.event_time)}</div>
                      <div className="incident-location">📍 {item.district_name}</div>
                    </Card>
                  )}
                  style={{ maxHeight: 'calc(100vh - 400px)', overflow: 'auto' }}
                />
              </div>
            </div>
          </Sider>

          <Content className="dashboard-content" style={{ padding: '24px' }}>
            <div className="content-top">
              <Card 
                className="map-card"
                title="Bản đồ an ninh"
                extra={
                  <div className="map-switch">
                    <span>Hotspots</span>
                    <Switch checked={mapMode === 'heatmap'} onChange={(checked) => setMapMode(checked ? 'heatmap' : 'hotspots')} />
                    <span>Heatmap</span>
                  </div>
                }
              >
                <div className="map-container">
                  <MapSection incidents={incidentsWithCoords} mapMode={mapMode} />
                </div>
              </Card>
            </div>

            <div className="content-bottom">
              <Row gutter={[16, 16]} className="analytics-grid">
                <Col xs={24} sm={8}>
                  <Card className="stat-card">
                    <Statistic 
                      title="Tổng số sự cố" 
                      value={totalIncidents} 
                      valueStyle={{ color: totalIncidents > 10 ? '#ff4d4f' : '#52c41a' }}
                    />
                    <div style={{ marginTop: 16 }}>
                      <Text>Điểm an ninh trung bình: </Text>
                      {getStatusTag(avgSecurityScore)}
                      <Text style={{ marginLeft: 8, fontWeight: 600 }}>{avgSecurityScore}</Text>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={8}>
                  <Card title="Xu hướng sự cố theo giờ" className="chart-card">
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="calculation_hour" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="total_incidents" stroke="#ff4d4f" name="Sự cố" />
                        <Line type="monotone" dataKey="security_score" stroke="#52c41a" name="Điểm AN" />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
                <Col xs={24} sm={8}>
                  <Card title="Thống kê theo loại sự cố" className="chart-card">
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={incidentByType}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#1890ff" name="Số vụ" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
              </Row>
            </div>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
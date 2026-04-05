import { useState, useMemo, useEffect } from 'react';
import { Layout, Input, Badge, Space, Select, DatePicker, List, Card, Tag, Switch, Row, Col, Statistic, Typography, ConfigProvider } from 'antd';
import { BellOutlined, SearchOutlined, FireOutlined } from '@ant-design/icons';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import MapSection from './MapSection';
import { Gold_Flat_Hotspots, Gold_Hourly_Security_Index, districtList, incidentTypes, severityConfig, incidentIcons } from '../data/mockData';

const { Header, Sider, Content } = Layout;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text } = Typography;

export default function DashboardLayout() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mapMode, setMapMode] = useState('hotspots');
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedIncidentType, setSelectedIncidentType] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [notifications] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredIncidents = useMemo(() => {
    return Gold_Flat_Hotspots.filter(item => {
      if (selectedDistrict && item.district_name !== selectedDistrict) return false;
      if (selectedIncidentType && item.incident_type !== selectedIncidentType) return false;
      if (dateRange && dateRange[0] && dateRange[1]) {
        const itemDate = new Date(item.event_time.split(' ')[0]);
        if (itemDate < dateRange[0].toDate() || itemDate > dateRange[1].toDate()) return false;
      }
      if (searchText) {
        const search = searchText.toLowerCase();
        if (!item.district_name.toLowerCase().includes(search) && 
            !item.incident_type.toLowerCase().includes(search)) return false;
      }
      return true;
    });
  }, [selectedDistrict, selectedIncidentType, dateRange, searchText]);

  const totalIncidents = filteredIncidents.length;
  const avgSecurityScore = Gold_Hourly_Security_Index.length > 0 
    ? (Gold_Hourly_Security_Index.reduce((sum, item) => sum + item.security_score, 0) / Gold_Hourly_Security_Index.length).toFixed(1)
    : 0;

  const incidentByType = useMemo(() => {
    const counts = {};
    filteredIncidents.forEach(item => {
      counts[item.incident_type] = (counts[item.incident_type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredIncidents]);

  const getSeverityTag = (severity) => {
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
            <Search 
              placeholder="Tìm kiếm..." 
              style={{ width: 200 }}
              onSearch={setSearchText}
            />
            <span className="header-time">
              {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <Badge count={notifications} size="small">
              <BellOutlined className="notification-icon" style={{ color: '#fff' }} />
            </Badge>
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
                    {incidentTypes.map(t => <Option key={t} value={t}>{t}</Option>)}
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
                          {incidentIcons[item.incident_type]} {item.incident_type}
                        </span>
                        {getSeverityTag(item.severity_weight)}
                      </div>
                      <div className="incident-time">{item.event_time}</div>
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
                  <MapSection incidents={filteredIncidents} mapMode={mapMode} />
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
                      <LineChart data={Gold_Hourly_Security_Index}>
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
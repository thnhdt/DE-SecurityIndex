import { useState, useEffect } from "react";
import axiosClient from "../api/axiosClient";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeThreats: 0,
    securityScore: 0,
    incidents: 0,
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

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

  const cards = [
    { title: "Total Users", value: stats.totalUsers, color: "#4f46e5", icon: "👥" },
    { title: "Active Threats", value: stats.activeThreats, color: "#dc2626", icon: "⚠️" },
    { title: "Security Score", value: `${stats.securityScore}%`, color: "#16a34a", icon: "🛡️" },
    { title: "Incidents", value: stats.incidents, color: "#ca8a04", icon: "📊" },
  ];

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Security Dashboard</h1>
        <p className="status">
          API Status: <span className={message.includes("Cannot") ? "offline" : "online"}>
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

      <div className="recent-activity">
        <h2>Recent Activity</h2>
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Severity</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Unauthorized login attempt</td>
              <td><span className="badge danger">High</span></td>
              <td>2 min ago</td>
              <td><span className="badge warning">Investigating</span></td>
            </tr>
            <tr>
              <td>Firewall rule updated</td>
              <td><span className="badge success">Low</span></td>
              <td>15 min ago</td>
              <td><span className="badge success">Resolved</span></td>
            </tr>
            <tr>
              <td>Malware detected on server-02</td>
              <td><span className="badge danger">Critical</span></td>
              <td>1 hour ago</td>
              <td><span className="badge warning">In Progress</span></td>
            </tr>
            <tr>
              <td>SSL certificate renewed</td>
              <td><span className="badge success">Low</span></td>
              <td>3 hours ago</td>
              <td><span className="badge success">Resolved</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

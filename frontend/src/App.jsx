import DashboardLayout from "./components/DashboardLayout";
import "./styles.css";
import { ConfigProvider } from "antd";

export default function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
        },
      }}
    >
      <DashboardLayout />
    </ConfigProvider>
  );
}

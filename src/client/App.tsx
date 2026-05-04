import { Route, Routes } from "react-router";
import { Layout } from "./components/Layout";
import { Today } from "./pages/Today";
import { History } from "./pages/History";
import { Charts } from "./pages/Charts";
import { Settings } from "./pages/Settings";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Today />} />
        <Route path="history" element={<History />} />
        <Route path="charts" element={<Charts />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

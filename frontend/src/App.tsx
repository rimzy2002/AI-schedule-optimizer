import { DashboardLayout } from "./components/DashboardLayout";

function App() {
  return (
    <DashboardLayout
      userSessionContext={{
        userId: "dev-stub",
        email: "dev@local.test",
        timezone: "UTC",
      }}
    >
      <p className="text-slate-600">Dashboard content goes here.</p>
    </DashboardLayout>
  );
}

export default App;

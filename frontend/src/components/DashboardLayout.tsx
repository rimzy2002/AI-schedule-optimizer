import type { ReactNode } from "react";
import type { UserSessionContext } from "@ai-schedule-optimizer/shared-types";

export interface DashboardLayoutProps {
  userSessionContext: UserSessionContext;
  children?: ReactNode;
}

export function DashboardLayout({ userSessionContext, children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-8">
      <header className="w-full max-w-4xl bg-white shadow-sm rounded-lg p-6 mb-8 border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <div className="text-sm text-slate-500 mt-2">
          Logged in as: <span className="font-mono text-slate-700">{userSessionContext.email}</span> (ID: {userSessionContext.userId})
        </div>
        <div className="text-sm text-slate-500">
          Timezone: <span className="font-medium text-slate-700">{userSessionContext.timezone}</span>
        </div>
      </header>
      <main className="w-full max-w-4xl bg-white shadow-sm rounded-lg p-6 border border-slate-200 flex-1">
        {children}
      </main>
    </div>
  );
}

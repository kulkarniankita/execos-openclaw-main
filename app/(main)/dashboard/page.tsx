import { RunAgentButton } from "@/components/agents/run-agent-button";

export default function DashboardPage() {
  return (
    <div className="page-wrapper">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">
          Welcome back! Here's what's happening with your AI Agents.
        </p>
        <RunAgentButton />
      </div>
    </div>
  );
}

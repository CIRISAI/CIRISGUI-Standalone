"use client";

import { useQuery } from "@tanstack/react-query";
import { cirisClient } from "../../lib/ciris-sdk";
import { useAuth } from "../../contexts/AuthContext";
import { StatusDot } from "../../components/Icons";

// Cognitive state color mapping (matching KMP)
const getCognitiveStateColor = (state: string | undefined): string => {
  if (!state) return "bg-gray-100 text-gray-700";
  const s = state.toUpperCase();
  if (s.includes("WORK")) return "bg-green-100 text-green-700";
  if (s.includes("PLAY")) return "bg-blue-100 text-blue-700";
  if (s.includes("SOLITUDE") || s.includes("DREAM")) return "bg-yellow-100 text-yellow-700";
  if (s.includes("WAKEUP") || s.includes("SHUTDOWN")) return "bg-orange-100 text-orange-700";
  return "bg-gray-100 text-gray-700";
};

// Progress bar color based on percentage (matching KMP)
const getProgressColor = (percent: number): string => {
  if (percent < 50) return "bg-green-500";
  if (percent < 80) return "bg-yellow-500";
  return "bg-red-500";
};

// Format uptime
const formatUptime = (seconds: number | undefined): string => {
  if (!seconds) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export default function TelemetryPage() {
  const { hasRole } = useAuth();

  // Fetch telemetry overview
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["telemetry-overview"],
    queryFn: () => cirisClient.telemetry.getOverview({}),
    refetchInterval: 5000,
  });

  // Fetch system services for health list
  const { data: services } = useQuery({
    queryKey: ["system-services"],
    queryFn: () => cirisClient.system.getServices(),
    refetchInterval: 5000,
  });

  // Fetch resources
  const { data: resources } = useQuery({
    queryKey: ["telemetry-resources"],
    queryFn: () => cirisClient.telemetry.getResources(),
    refetchInterval: 5000,
  });

  // Calculate service health counts
  const healthyCount = overview?.healthy_services ?? 0;
  const totalCount = healthyCount + (overview?.degraded_services ?? 0);

  // Resource percentages
  const cpuPercent = overview?.cpu_percent ?? 0;
  const memoryMb = overview?.memory_mb ?? 0;
  const memoryPercent = Math.min(100, (memoryMb / 1024) * 10); // Rough estimate

  if (overviewLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading telemetry data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Telemetry Dashboard</h1>
        <span className="text-sm text-gray-500">
          Uptime: {formatUptime(overview?.uptime_seconds)}
        </span>
      </div>

      {/* Services Overview Card - matching KMP */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Services Overview</h2>

        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-3xl font-bold text-gray-900">{healthyCount}</span>
            <span className="text-lg text-gray-500">/{totalCount}</span>
            <span className="text-sm text-gray-500 ml-2">healthy</span>
          </div>

          <div
            className={`px-4 py-2 rounded-lg font-medium ${getCognitiveStateColor(overview?.cognitive_state)}`}
          >
            {overview?.cognitive_state || "UNKNOWN"}
          </div>
        </div>

        {overview?.current_task && (
          <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
            <span className="font-medium">Current Task:</span> {overview.current_task}
          </div>
        )}
      </div>

      {/* Resource Usage - matching KMP */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Resource Usage</h2>

        <div className="space-y-4">
          {/* CPU */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">CPU</span>
              <span className="font-medium">{cpuPercent.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressColor(cpuPercent)} transition-all`}
                style={{ width: `${Math.min(100, cpuPercent)}%` }}
              />
            </div>
          </div>

          {/* Memory */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Memory</span>
              <span className="font-medium">{memoryMb.toFixed(0)} MB</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressColor(memoryPercent)} transition-all`}
                style={{ width: `${Math.min(100, memoryPercent)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Activity Metrics (24h) - matching KMP */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity (24h)</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {overview?.messages_processed_24h ?? 0}
            </div>
            <div className="text-sm text-gray-500">Messages</div>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {overview?.tasks_completed_24h ?? 0}
            </div>
            <div className="text-sm text-gray-500">Tasks</div>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {overview?.thoughts_processed_24h ?? 0}
            </div>
            <div className="text-sm text-gray-500">Thoughts</div>
          </div>

          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div
              className={`text-2xl font-bold ${(overview?.errors_24h ?? 0) > 0 ? "text-red-600" : "text-gray-900"}`}
            >
              {overview?.errors_24h ?? 0}
            </div>
            <div className="text-sm text-gray-500">Errors</div>
          </div>
        </div>
      </div>

      {/* Cost & Efficiency */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cost & Efficiency</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-700">
              {((overview?.tokens_24h ?? 0) / 1000).toFixed(1)}K
            </div>
            <div className="text-sm text-gray-500">Tokens (24h)</div>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-700">
              ${((overview?.cost_24h_cents ?? 0) / 100).toFixed(2)}
            </div>
            <div className="text-sm text-gray-500">Cost (24h)</div>
          </div>

          <div className="text-center p-4 bg-emerald-50 rounded-lg">
            <div className="text-2xl font-bold text-emerald-700">
              {(overview?.carbon_24h_grams ?? 0).toFixed(1)}g
            </div>
            <div className="text-sm text-gray-500">CO2 (24h)</div>
          </div>

          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <div className="text-2xl font-bold text-amber-700">
              {((overview?.energy_24h_kwh ?? 0) * 1000).toFixed(1)}Wh
            </div>
            <div className="text-sm text-gray-500">Energy (24h)</div>
          </div>
        </div>
      </div>

      {/* Service Health List - matching KMP */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Health</h2>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {services?.services?.map((service: { name: string; status: string }, index: number) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <StatusDot status={service.status === "healthy" ? "green" : "red"} />
                <span className="text-sm font-medium text-gray-700">{service.name}</span>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  service.status === "healthy"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {service.status}
              </span>
            </div>
          )) ?? <div className="text-center text-gray-500 py-4">No services available</div>}
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Agent Status</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Reasoning Depth</div>
            <div className="text-xl font-bold text-gray-900">{overview?.reasoning_depth ?? 0}</div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Active Deferrals</div>
            <div className="text-xl font-bold text-gray-900">{overview?.active_deferrals ?? 0}</div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Recent Incidents</div>
            <div
              className={`text-xl font-bold ${(overview?.recent_incidents ?? 0) > 0 ? "text-red-600" : "text-gray-900"}`}
            >
              {overview?.recent_incidents ?? 0}
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Error Rate</div>
            <div className="text-xl font-bold text-gray-900">
              {(overview?.error_rate_percent ?? 0).toFixed(1)}%
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Total Metrics</div>
            <div className="text-xl font-bold text-gray-900">{overview?.total_metrics ?? 0}</div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Active Services</div>
            <div className="text-xl font-bold text-gray-900">{overview?.active_services ?? 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

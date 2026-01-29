"use client";

import React, { useState, useEffect } from "react";
import { cirisClient } from "@/lib/ciris-sdk";
import type {
  AdapterDiscoveryReport,
  AdapterAvailabilityStatus,
  AdapterInstallResponse,
} from "@/lib/ciris-sdk/resources/system";

interface AdapterDiscoveryCardProps {
  onAdaptersLoaded?: (report: AdapterDiscoveryReport) => void;
  onAdapterInstalled?: (adapterName: string) => void;
}

export function AdapterDiscoveryCard({
  onAdaptersLoaded,
  onAdapterInstalled,
}: AdapterDiscoveryCardProps) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<AdapterDiscoveryReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [installingAdapter, setInstallingAdapter] = useState<string | null>(null);
  const [installResult, setInstallResult] = useState<{
    adapter: string;
    result: AdapterInstallResponse;
  } | null>(null);

  useEffect(() => {
    loadAdapters();
  }, []);

  const loadAdapters = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use setup endpoint (no auth required) instead of system endpoint
      const discoveryReport = await cirisClient.setup.getAvailableAdapters();
      setReport(discoveryReport);
      onAdaptersLoaded?.(discoveryReport);
    } catch (err: any) {
      setError(err.message || "Failed to load adapters");
    } finally {
      setLoading(false);
    }
  };

  const installAdapter = async (adapterName: string) => {
    setInstallingAdapter(adapterName);
    setInstallResult(null);
    try {
      const result = await cirisClient.system.installAdapterDependencies(adapterName, {
        dry_run: false,
      });
      setInstallResult({ adapter: adapterName, result });
      if (result.success && result.now_eligible) {
        // Reload adapters to update the list
        await loadAdapters();
        onAdapterInstalled?.(adapterName);
      }
    } catch (err: any) {
      setInstallResult({
        adapter: adapterName,
        result: {
          success: false,
          message: err.message || "Installation failed",
          now_eligible: false,
          error: err.message,
        },
      });
    } finally {
      setInstallingAdapter(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full" />
          <span className="text-gray-600">Discovering adapters...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-700">
          <span className="text-xl">!</span>
          <span>{error}</span>
        </div>
        <button
          onClick={loadAdapters}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!report) return null;

  const installableAdapters = report.ineligible.filter(a => a.can_install);
  const unavailableAdapters = report.ineligible.filter(a => !a.can_install);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔧</span>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Available Adapters</h3>
            <p className="text-sm text-gray-500">
              {report.total_eligible} ready, {report.total_installable} can be installed
            </p>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
          >
            {expanded ? "Collapse" : "View Details"}
          </button>
        </div>
      </div>

      {/* Summary (always visible) */}
      <div className="p-4 bg-gray-50">
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-green-600">✅</span>
            <span>{report.total_eligible} Ready</span>
          </div>
          {report.total_installable > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-yellow-600">⚠️</span>
              <span>{report.total_installable} Installable</span>
            </div>
          )}
          {unavailableAdapters.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">❌</span>
              <span>{unavailableAdapters.length} Manual Setup</span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="p-4 space-y-4">
          {/* Ready Adapters */}
          <div>
            <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-2">
              <span className="text-green-600">✅</span> Ready to Use ({report.eligible.length})
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {report.eligible.slice(0, 8).map(adapter => (
                <div
                  key={adapter.name}
                  className="text-sm text-gray-700 px-2 py-1 bg-green-50 rounded"
                >
                  {adapter.name}
                </div>
              ))}
              {report.eligible.length > 8 && (
                <div className="text-sm text-gray-500 px-2 py-1">
                  +{report.eligible.length - 8} more
                </div>
              )}
            </div>
          </div>

          {/* Installable Adapters */}
          {installableAdapters.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-yellow-700 mb-2 flex items-center gap-2">
                <span className="text-yellow-600">⚠️</span> Can Be Installed (
                {installableAdapters.length})
              </h4>
              <div className="space-y-2">
                {installableAdapters.map(adapter => (
                  <InstallableAdapterRow
                    key={adapter.name}
                    adapter={adapter}
                    installing={installingAdapter === adapter.name}
                    installResult={
                      installResult?.adapter === adapter.name ? installResult.result : null
                    }
                    onInstall={() => installAdapter(adapter.name)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Manual Setup Required */}
          {unavailableAdapters.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                <span>❌</span> Requires Manual Setup ({unavailableAdapters.length})
              </h4>
              <div className="space-y-2">
                {unavailableAdapters.map(adapter => (
                  <div key={adapter.name} className="p-2 bg-gray-50 rounded border border-gray-200">
                    <div className="font-medium text-sm text-gray-700">{adapter.name}</div>
                    <div className="text-xs text-gray-500">
                      {adapter.eligibility_reason || "Manual configuration required"}
                    </div>
                    {adapter.missing_env_vars && adapter.missing_env_vars.length > 0 && (
                      <div className="text-xs text-gray-400 mt-1">
                        Needs: {adapter.missing_env_vars.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface InstallableAdapterRowProps {
  adapter: AdapterAvailabilityStatus;
  installing: boolean;
  installResult: AdapterInstallResponse | null;
  onInstall: () => void;
}

function InstallableAdapterRow({
  adapter,
  installing,
  installResult,
  onInstall,
}: InstallableAdapterRowProps) {
  const getInstallMethodLabel = () => {
    if (!adapter.install_hints || adapter.install_hints.length === 0) return null;
    const hint = adapter.install_hints[0];
    switch (hint.kind) {
      case "brew":
        return "Homebrew";
      case "apt":
        return "apt";
      case "pip":
        return "pip";
      case "npm":
        return "npm";
      case "choco":
        return "Chocolatey";
      default:
        return hint.kind;
    }
  };

  return (
    <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="font-medium text-sm text-gray-900">{adapter.name}</div>
          <div className="text-xs text-gray-600">
            Missing: {adapter.missing_binaries?.join(", ") || "dependencies"}
          </div>
          {getInstallMethodLabel() && (
            <div className="text-xs text-gray-500 mt-1">Install via {getInstallMethodLabel()}</div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {installResult ? (
            installResult.success ? (
              <span className="text-xs text-green-600 font-medium">✓ Installed</span>
            ) : (
              <span className="text-xs text-red-600">{installResult.error || "Failed"}</span>
            )
          ) : (
            <button
              onClick={onInstall}
              disabled={installing}
              className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {installing ? (
                <span className="flex items-center gap-1">
                  <span className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full" />
                  Installing...
                </span>
              ) : (
                "Install Now"
              )}
            </button>
          )}
        </div>
      </div>

      {/* Installation progress/output */}
      {installing && (
        <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono text-gray-600">
          Installing dependencies...
        </div>
      )}
    </div>
  );
}

export default AdapterDiscoveryCard;

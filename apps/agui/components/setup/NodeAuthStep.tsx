"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cirisClient } from "../../lib/ciris-sdk";
import type {
  DeviceAuthState,
  DeviceAuthStatus,
  ConnectNodeResponse,
  ConnectNodeStatusResponse,
} from "../../lib/ciris-sdk/resources/setup";
import toast from "react-hot-toast";

interface NodeAuthStepProps {
  deviceAuth: DeviceAuthState;
  onDeviceAuthChange: (state: DeviceAuthState) => void;
  onComplete: () => void;
}

const DEFAULT_NODE_URLS = [
  { label: "CIRIS US (Primary)", url: "https://portal.ciris-services-1.ai" },
  { label: "CIRIS EU", url: "https://portal.ciris-services-2.ai" },
];

export function NodeAuthStep({ deviceAuth, onDeviceAuthChange, onComplete }: NodeAuthStepProps) {
  const [nodeUrlInput, setNodeUrlInput] = useState(deviceAuth.nodeUrl || "");
  const [showCustomUrl, setShowCustomUrl] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Define startPolling first (before useEffect that uses it)
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    const pollInterval = (deviceAuth.interval || 5) * 1000;
    console.log(`[NodeAuth] Starting polling every ${pollInterval}ms`);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const result = await cirisClient.setup.connectNodeStatus(
          deviceAuth.deviceCode,
          deviceAuth.portalUrl
        );

        console.log("[NodeAuth] Poll result:", result);

        if (result.status === "complete") {
          clearInterval(pollIntervalRef.current!);
          pollIntervalRef.current = null;

          onDeviceAuthChange({
            ...deviceAuth,
            status: "complete",
            provisionedTemplate: result.provisioned_template,
            provisionedAdapters: result.approved_adapters || [],
            signingKeyB64: result.signing_key_b64,
            keyId: result.key_id,
            orgId: result.org_id,
            stewardshipTier: result.stewardship_tier,
            nodeUrl: result.node_url || deviceAuth.nodeUrl,
          });

          toast.success("Connected to Node successfully!");
          onComplete();
        } else if (result.status === "error") {
          clearInterval(pollIntervalRef.current!);
          pollIntervalRef.current = null;

          onDeviceAuthChange({
            ...deviceAuth,
            status: "error",
            error: result.error || "Authorization failed",
          });

          toast.error(result.error || "Authorization failed");
        }
        // "pending" status - keep polling
      } catch (error) {
        console.error("[NodeAuth] Poll error:", error);
        // Don't stop polling on transient errors
      }
    }, pollInterval);
  }, [deviceAuth, onDeviceAuthChange, onComplete]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Start polling when in WAITING status
  useEffect(() => {
    if (deviceAuth.status === "waiting" && deviceAuth.deviceCode) {
      startPolling();
    } else if (deviceAuth.status !== "waiting" && pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, [deviceAuth.status, deviceAuth.deviceCode, startPolling]);

  const initiateDeviceAuth = async (url: string) => {
    const portalUrl = url.trim().replace(/\/$/, "");
    if (!portalUrl) {
      toast.error("Please enter a Portal URL");
      return;
    }

    onDeviceAuthChange({
      ...deviceAuth,
      nodeUrl: portalUrl,
      portalUrl: portalUrl,
      status: "connecting",
      error: null,
    });

    try {
      console.log("[NodeAuth] Initiating device auth with:", portalUrl);
      const response = await cirisClient.setup.connectNode(portalUrl);

      console.log("[NodeAuth] Device auth response:", response);

      onDeviceAuthChange({
        ...deviceAuth,
        nodeUrl: portalUrl,
        portalUrl: response.portal_url || portalUrl,
        verificationUri: response.verification_uri,
        deviceCode: response.device_code,
        userCode: response.user_code,
        expiresIn: response.expires_in,
        interval: response.interval,
        status: "waiting",
        error: null,
      });

      // Open verification URI in new tab
      window.open(response.verification_uri, "_blank");
      toast.success("Opening authorization page in new tab...");
    } catch (error) {
      console.error("[NodeAuth] Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to connect to Portal";
      onDeviceAuthChange({
        ...deviceAuth,
        status: "error",
        error: errorMessage,
      });
      toast.error(errorMessage);
    }
  };

  const cancelAuth = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    onDeviceAuthChange({
      ...deviceAuth,
      status: "idle",
      deviceCode: "",
      userCode: "",
      verificationUri: "",
      error: null,
    });
  };

  const formatTimeRemaining = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Idle / Error State - Show URL input */}
      {(deviceAuth.status === "idle" || deviceAuth.status === "error") && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Connect to CIRISNode</h3>
            <p className="text-sm text-blue-800">
              Connect your agent to the CIRIS network for managed deployment, template provisioning,
              and deferral routing. Your organization's administrator will approve your agent in the
              Portal.
            </p>
          </div>

          {/* Quick select buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select a Node</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEFAULT_NODE_URLS.map(node => (
                <button
                  key={node.url}
                  onClick={() => initiateDeviceAuth(node.url)}
                  className="p-4 border-2 border-gray-200 rounded-lg text-left hover:border-indigo-300 hover:bg-indigo-50 transition-all"
                >
                  <div className="font-semibold text-gray-900">{node.label}</div>
                  <div className="text-xs text-gray-500 mt-1 truncate">{node.url}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom URL option */}
          <div>
            <button
              onClick={() => setShowCustomUrl(!showCustomUrl)}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              {showCustomUrl ? "Hide custom URL" : "Use custom Portal URL"}
            </button>

            {showCustomUrl && (
              <div className="mt-3 space-y-3">
                <input
                  type="text"
                  value={nodeUrlInput}
                  onChange={e => setNodeUrlInput(e.target.value)}
                  placeholder="https://portal.your-org.ai"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  onClick={() => initiateDeviceAuth(nodeUrlInput)}
                  disabled={!nodeUrlInput.trim()}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Connect
                </button>
              </div>
            )}
          </div>

          {/* Error display */}
          {deviceAuth.status === "error" && deviceAuth.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{deviceAuth.error}</p>
            </div>
          )}
        </>
      )}

      {/* Connecting State */}
      {deviceAuth.status === "connecting" && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to Portal...</p>
          <p className="text-sm text-gray-500 mt-2">{deviceAuth.portalUrl}</p>
        </div>
      )}

      {/* Waiting State - Show user code and instructions */}
      {deviceAuth.status === "waiting" && (
        <div className="space-y-6">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 text-center">
            <h3 className="font-semibold text-indigo-900 mb-2">Authorization Required</h3>
            <p className="text-sm text-indigo-800 mb-4">
              Enter this code in the Portal to authorize your agent:
            </p>
            <div className="bg-white rounded-lg p-4 inline-block shadow-sm">
              <span className="text-3xl font-mono font-bold tracking-widest text-indigo-900">
                {deviceAuth.userCode}
              </span>
            </div>
            <p className="text-xs text-indigo-600 mt-4">
              Expires in {formatTimeRemaining(deviceAuth.expiresIn)}
            </p>
          </div>

          <div className="flex flex-col items-center space-y-3">
            <button
              onClick={() => window.open(deviceAuth.verificationUri, "_blank")}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Open Portal in Browser
            </button>

            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className="animate-pulse w-2 h-2 bg-indigo-600 rounded-full"></div>
              <span>Waiting for authorization...</span>
            </div>

            <button onClick={cancelAuth} className="text-sm text-gray-500 hover:text-gray-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Complete State */}
      {deviceAuth.status === "complete" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 text-xl">✓</span>
            </div>
            <div>
              <h3 className="font-semibold text-green-900">Connected to Node</h3>
              <p className="text-sm text-green-700">{deviceAuth.nodeUrl}</p>
            </div>
          </div>

          {deviceAuth.provisionedTemplate && (
            <div className="mt-4 p-3 bg-white rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Provisioned Configuration</h4>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-gray-500">Template:</dt>
                <dd className="text-gray-900">{deviceAuth.provisionedTemplate}</dd>
                {deviceAuth.orgId && (
                  <>
                    <dt className="text-gray-500">Organization:</dt>
                    <dd className="text-gray-900">{deviceAuth.orgId}</dd>
                  </>
                )}
                {deviceAuth.stewardshipTier && (
                  <>
                    <dt className="text-gray-500">Stewardship Tier:</dt>
                    <dd className="text-gray-900">{deviceAuth.stewardshipTier}</dd>
                  </>
                )}
              </dl>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NodeAuthStep;

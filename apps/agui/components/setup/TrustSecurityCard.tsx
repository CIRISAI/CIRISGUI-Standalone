"use client";

import { useState, useEffect } from "react";
import { cirisClient } from "../../lib/ciris-sdk";
import type { VerifyStatusResponse } from "../../lib/ciris-sdk/resources/setup";

interface TrustSecurityCardProps {
  className?: string;
}

/**
 * Trust and Security Card
 *
 * Displays CIRISVerify status including:
 * - Library loaded status (REQUIRED for CIRIS 2.0+)
 * - Hardware security type
 * - Key status (Portal key activation)
 * - Attestation status
 * - Disclaimer about cryptographic verification
 */
export function TrustSecurityCard({ className = "" }: TrustSecurityCardProps) {
  const [status, setStatus] = useState<VerifyStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const result = await cirisClient.setup.getVerifyStatus();
        setStatus(result);
        setError(null);
      } catch (err) {
        console.error("[TrustSecurity] Failed to fetch verify status:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch status");
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getKeyStatusLabel = (keyStatus: string): { label: string; color: string } => {
    switch (keyStatus) {
      case "portal_active":
        return { label: "Portal Key Active", color: "text-green-700 bg-green-100" };
      case "portal_pending":
        return { label: "Portal Key Pending", color: "text-yellow-700 bg-yellow-100" };
      case "ephemeral":
        return { label: "Ephemeral Key", color: "text-blue-700 bg-blue-100" };
      default:
        return { label: "No Key", color: "text-gray-700 bg-gray-100" };
    }
  };

  const getAttestationLabel = (attestation: string): { label: string; color: string } => {
    switch (attestation) {
      case "verified":
        return { label: "Verified", color: "text-green-700 bg-green-100" };
      case "pending":
        return { label: "Pending", color: "text-yellow-700 bg-yellow-100" };
      case "failed":
        return { label: "Failed", color: "text-red-700 bg-red-100" };
      default:
        return { label: "Not Attempted", color: "text-gray-700 bg-gray-100" };
    }
  };

  if (loading) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // CIRISVerify not loaded - CRITICAL ERROR for 2.0
  if (!status?.loaded) {
    return (
      <div className={`bg-red-50 border border-red-300 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-red-600 text-lg">⚠</span>
          <h3 className="font-semibold text-red-900">CIRISVerify Required</h3>
        </div>
        <p className="text-sm text-red-800 mb-2">
          CIRISVerify is <strong>required</strong> for CIRIS 2.0 agents. The agent cannot operate
          without cryptographic identity verification.
        </p>
        {(error || status?.error) && (
          <p className="text-xs text-red-700 bg-red-100 rounded p-2 font-mono">
            {error || status?.error}
          </p>
        )}
        <div className="mt-3 pt-3 border-t border-red-200 text-xs text-red-700">
          <a
            href="https://github.com/CIRISAI/CIRISVerify"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-red-900"
          >
            Install CIRISVerify →
          </a>
        </div>
      </div>
    );
  }

  const keyStatus = getKeyStatusLabel(status.key_status);
  const attestation = getAttestationLabel(status.attestation_status);

  return (
    <div className={`bg-emerald-50 border border-emerald-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-emerald-900 flex items-center gap-2">
          <span className="text-emerald-600">🛡</span>
          Trust &amp; Security
        </h3>
        <span className="text-xs px-2 py-1 rounded bg-emerald-200 text-emerald-800">
          v{status.version || "?"}
        </span>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-xs text-emerald-700 font-medium">Hardware</p>
          <p className="text-sm text-emerald-900">
            {status.hardware_type?.replace(/_/g, " ") || "Unknown"}
          </p>
        </div>
        <div>
          <p className="text-xs text-emerald-700 font-medium">Key Status</p>
          <span className={`text-xs px-2 py-0.5 rounded ${keyStatus.color}`}>
            {keyStatus.label}
          </span>
        </div>
        <div>
          <p className="text-xs text-emerald-700 font-medium">Attestation</p>
          <span className={`text-xs px-2 py-0.5 rounded ${attestation.color}`}>
            {attestation.label}
          </span>
        </div>
        {status.key_id && (
          <div>
            <p className="text-xs text-emerald-700 font-medium">Key ID</p>
            <p className="text-xs text-emerald-800 font-mono truncate">{status.key_id}</p>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="text-xs text-emerald-700 bg-emerald-100 rounded p-2">
        <p>
          CIRISVerify provides cryptographic attestation of agent identity. This enables
          participation in the <strong>Coherence Ratchet</strong> and <strong>CIRIS Scoring</strong>
          .
        </p>
      </div>

      {/* Links */}
      <div className="mt-3 pt-3 border-t border-emerald-200 text-xs text-emerald-700">
        <a
          href="https://ciris.ai/coherence-ratchet"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-emerald-900"
        >
          Coherence Ratchet
        </a>
        {" · "}
        <a
          href="https://ciris.ai/ciris-scoring"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-emerald-900"
        >
          CIRIS Scoring
        </a>
        {" · "}
        <a
          href="https://github.com/CIRISAI/CIRISVerify"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-emerald-900"
        >
          CIRISVerify
        </a>
      </div>
    </div>
  );
}

export default TrustSecurityCard;

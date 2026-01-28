'use client';

import React from 'react';

interface CovenantMetricsConsentProps {
  consentGiven: boolean;
  onConsentChange: (consent: boolean) => void;
}

export function CovenantMetricsConsent({
  consentGiven,
  onConsentChange,
}: CovenantMetricsConsentProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
      {/* Header - matches KMP InfoLight styling */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xl">📊</span>
        <h3 className="font-bold text-blue-900 text-base">Help Improve AI Alignment</h3>
      </div>

      {/* Description */}
      <p className="text-sm text-blue-800 leading-relaxed mb-4">
        Share anonymous metrics with CIRIS L3C to advance AI alignment research.
        This includes your LLM provider and API base URL to help study alignment
        patterns across different providers and models.
      </p>

      {/* Data disclosure */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Data shared:</h4>
        <div className="pl-2 space-y-1">
          <DataPointRow text="Reasoning quality scores" />
          <DataPointRow text="Decision patterns (no message content)" />
          <DataPointRow text="LLM provider and API base URL" />
          <DataPointRow text="Performance metrics" />
        </div>
      </div>

      {/* Never sent - green callout */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
        <p className="text-xs text-green-800">
          <span className="font-medium">Never sent:</span> User messages, file contents,
          personal information, API keys, or full reasoning text
        </p>
      </div>

      {/* Consent checkbox - prominent placement */}
      <label className="flex items-center gap-3 p-3 bg-white/60 rounded-lg cursor-pointer hover:bg-white/80 transition-colors border border-blue-200">
        <input
          type="checkbox"
          checked={consentGiven}
          onChange={e => onConsentChange(e.target.checked)}
          className="h-5 w-5 rounded border-blue-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-sm font-medium text-blue-900">
          I agree to share anonymous alignment metrics
        </span>
      </label>

      {/* Privacy link */}
      <a
        href="https://ciris.ai/privacy"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 mt-3"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Learn more about our privacy practices
      </a>
    </div>
  );
}

function DataPointRow({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 text-sm text-gray-600">
      <span className="text-indigo-500 mt-0.5">•</span>
      <span>{text}</span>
    </li>
  );
}

export default CovenantMetricsConsent;

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
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📊</span>
          <div>
            <h3 className="font-semibold text-gray-900">Help Improve AI Alignment</h3>
            <p className="text-sm text-gray-500">Share anonymous metrics with CIRIS L3C</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <p className="text-sm text-gray-700">
          Share anonymous usage metrics with CIRIS L3C to advance AI alignment research.
          This includes your API base URL to help study alignment patterns across different
          providers and models.
        </p>

        {/* Data disclosure */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Data shared:</h4>
          <ul className="space-y-1">
            <DataPointRow text="Reasoning quality scores (numeric values only)" />
            <DataPointRow text="Decision patterns (TOOL/SPEAK/PONDER, no message content)" />
            <DataPointRow text="LLM provider and API base URL" />
            <DataPointRow text="Performance metrics (latency, token counts)" />
          </ul>
        </div>

        {/* Never sent */}
        <div className="bg-green-50 border border-green-200 rounded p-3">
          <h4 className="text-sm font-medium text-green-800 mb-1">Never sent:</h4>
          <p className="text-xs text-green-700">
            User messages, file contents, personal information, API keys, or full reasoning text
          </p>
        </div>

        {/* Privacy link */}
        <a
          href="https://ciris.ai/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Learn more about our privacy practices
        </a>

        {/* Consent checkbox */}
        <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
          <input
            type="checkbox"
            checked={consentGiven}
            onChange={e => onConsentChange(e.target.checked)}
            className="mt-0.5 h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-900">
              I agree to share anonymous alignment metrics
            </span>
            <p className="text-xs text-gray-500 mt-0.5">
              You can change this setting later in the Privacy settings
            </p>
          </div>
        </label>
      </div>
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

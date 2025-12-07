"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cirisClient } from "../../lib/ciris-sdk";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";
import { StatusDot } from "../../components/Icons";
import type { ProcessorStateInfo, StateTransitionResponse } from "../../lib/ciris-sdk/types";

// Cognitive state colors matching Kotlin SessionsFragment
const STATE_COLORS: Record<string, { bg: string; text: string; border: string; light: string }> = {
  WORK: {
    bg: "bg-blue-600",
    text: "text-blue-800",
    border: "border-blue-300",
    light: "bg-blue-50",
  },
  DREAM: {
    bg: "bg-purple-600",
    text: "text-purple-800",
    border: "border-purple-300",
    light: "bg-purple-50",
  },
  PLAY: {
    bg: "bg-amber-500",
    text: "text-amber-800",
    border: "border-amber-300",
    light: "bg-amber-50",
  },
  SOLITUDE: {
    bg: "bg-sky-500",
    text: "text-sky-800",
    border: "border-sky-300",
    light: "bg-sky-50",
  },
};

const STATE_DESCRIPTIONS: Record<string, { title: string; description: string; icon: string }> = {
  WORK: {
    title: "Work Mode",
    description: "Normal operational state for processing tasks and interactions.",
    icon: "💼",
  },
  DREAM: {
    title: "Dream Session",
    description:
      "Deep introspection and memory consolidation. The agent reflects on past experiences and strengthens important memories.",
    icon: "🌙",
  },
  PLAY: {
    title: "Play Session",
    description:
      "Creative exploration and experimentation. The agent explores novel ideas and approaches without strict task constraints.",
    icon: "🎮",
  },
  SOLITUDE: {
    title: "Solitude Session",
    description:
      "Quiet reflection and planning. The agent engages in self-directed contemplation and strategic thinking.",
    icon: "🧘",
  },
};

export default function CognitiveSessionsPage() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    targetState: string;
    title: string;
    message: string;
  } | null>(null);

  // Fetch processor states
  const {
    data: processorStates,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["processor-states"],
    queryFn: async () => {
      const response = await cirisClient.system.getProcessorStates();
      // Handle wrapped response
      const states = (response as any)?.data || response;
      return states as ProcessorStateInfo[];
    },
    refetchInterval: 3000, // Poll every 3 seconds like Kotlin
  });

  // Find the current active state
  const activeState = processorStates?.find(s => s.is_active);
  const currentState = activeState?.name || "UNKNOWN";

  // State transition mutation
  const transitionMutation = useMutation({
    mutationFn: async (targetState: string) => {
      if (!hasRole("ADMIN")) {
        throw new Error("Admin privileges required to change cognitive state");
      }
      return cirisClient.system.transitionState({
        target_state: targetState as "WORK" | "DREAM" | "PLAY" | "SOLITUDE",
        reason: "Requested via Web UI Sessions page",
      });
    },
    onSuccess: (data: StateTransitionResponse) => {
      if (data.success) {
        toast.success(`Transitioned to ${data.current_state}`);
        refetch();
      } else {
        toast.error(data.message || "Transition not initiated");
      }
    },
    onError: (error: any) => {
      const message = error.message || "Failed to transition state";
      toast.error(message);
    },
  });

  const handleInitiateSession = (targetState: string) => {
    const stateInfo = STATE_DESCRIPTIONS[targetState];
    const title =
      targetState === "WORK" ? "Return to Work" : `Initiate ${stateInfo?.title || targetState}`;
    const message =
      targetState === "WORK"
        ? "Return to normal WORK state?"
        : `Initiate a ${targetState} session? ${stateInfo?.description || ""}`;

    setConfirmDialog({
      isOpen: true,
      targetState,
      title,
      message,
    });
  };

  const handleConfirmTransition = () => {
    if (confirmDialog) {
      transitionMutation.mutate(confirmDialog.targetState);
      setConfirmDialog(null);
    }
  };

  const getStateColors = (state: string) => {
    return STATE_COLORS[state] || STATE_COLORS.WORK;
  };

  const isInSpecialState =
    currentState !== "WORK" && currentState !== "WAKEUP" && currentState !== "SHUTDOWN";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Cognitive Sessions</h2>
              <p className="mt-1 text-sm text-gray-500">
                Manage CIRIS cognitive states: Dream, Play, and Solitude sessions
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Current State Banner */}
      <div
        className={`rounded-lg p-6 ${getStateColors(currentState).light} border-2 ${getStateColors(currentState).border}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div
              className={`w-4 h-4 rounded-full ${getStateColors(currentState).bg} animate-pulse`}
            ></div>
            <div>
              <h3 className={`text-lg font-semibold ${getStateColors(currentState).text}`}>
                Current State: {currentState}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {STATE_DESCRIPTIONS[currentState]?.description ||
                  "Agent is in this cognitive state"}
              </p>
            </div>
          </div>
          <span className="text-4xl">{STATE_DESCRIPTIONS[currentState]?.icon || "🤖"}</span>
        </div>
      </div>

      {/* Admin Warning */}
      {!hasRole("ADMIN") && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Admin Access Required</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Cognitive state transitions require Administrator privileges. You can view the
                current state but cannot initiate sessions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cognitive State Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Dream Card */}
        <div
          className={`bg-white rounded-lg shadow-lg overflow-hidden border-2 ${currentState === "DREAM" ? "border-purple-500" : "border-gray-200"}`}
        >
          <div className="bg-purple-50 px-4 py-3 border-b border-purple-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
                <span className="text-2xl">🌙</span> Dream
              </h3>
              {currentState === "DREAM" && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-600 text-white">
                  ACTIVE
                </span>
              )}
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-4">
              Deep introspection and memory consolidation. Reflect on past experiences and
              strengthen important memories.
            </p>
            <div className="flex items-center justify-between">
              <StatusDot status={currentState === "DREAM" ? "green" : "gray"} className="mr-2" />
              <button
                onClick={() => handleInitiateSession("DREAM")}
                disabled={
                  currentState !== "WORK" || transitionMutation.isPending || !hasRole("ADMIN")
                }
                className="px-4 py-2 text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {transitionMutation.isPending ? "Initiating..." : "Initiate Dream"}
              </button>
            </div>
          </div>
        </div>

        {/* Play Card */}
        <div
          className={`bg-white rounded-lg shadow-lg overflow-hidden border-2 ${currentState === "PLAY" ? "border-amber-500" : "border-gray-200"}`}
        >
          <div className="bg-amber-50 px-4 py-3 border-b border-amber-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-amber-900 flex items-center gap-2">
                <span className="text-2xl">🎮</span> Play
              </h3>
              {currentState === "PLAY" && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-500 text-white">
                  ACTIVE
                </span>
              )}
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-4">
              Creative exploration and experimentation. Explore novel ideas and approaches without
              strict task constraints.
            </p>
            <div className="flex items-center justify-between">
              <StatusDot status={currentState === "PLAY" ? "green" : "gray"} className="mr-2" />
              <button
                onClick={() => handleInitiateSession("PLAY")}
                disabled={
                  currentState !== "WORK" || transitionMutation.isPending || !hasRole("ADMIN")
                }
                className="px-4 py-2 text-sm font-medium rounded-md text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {transitionMutation.isPending ? "Initiating..." : "Initiate Play"}
              </button>
            </div>
          </div>
        </div>

        {/* Solitude Card */}
        <div
          className={`bg-white rounded-lg shadow-lg overflow-hidden border-2 ${currentState === "SOLITUDE" ? "border-sky-500" : "border-gray-200"}`}
        >
          <div className="bg-sky-50 px-4 py-3 border-b border-sky-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-sky-900 flex items-center gap-2">
                <span className="text-2xl">🧘</span> Solitude
              </h3>
              {currentState === "SOLITUDE" && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-sky-500 text-white">
                  ACTIVE
                </span>
              )}
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-4">
              Quiet reflection and planning. Engage in self-directed contemplation and strategic
              thinking.
            </p>
            <div className="flex items-center justify-between">
              <StatusDot status={currentState === "SOLITUDE" ? "green" : "gray"} className="mr-2" />
              <button
                onClick={() => handleInitiateSession("SOLITUDE")}
                disabled={
                  currentState !== "WORK" || transitionMutation.isPending || !hasRole("ADMIN")
                }
                className="px-4 py-2 text-sm font-medium rounded-md text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {transitionMutation.isPending ? "Initiating..." : "Initiate Solitude"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Return to Work Button */}
      {isInSpecialState && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Return to Normal Operation</h3>
              <p className="text-sm text-gray-500 mt-1">
                End the current {currentState} session and return to WORK state.
              </p>
            </div>
            <button
              onClick={() => handleInitiateSession("WORK")}
              disabled={transitionMutation.isPending || !hasRole("ADMIN")}
              className="px-6 py-3 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {transitionMutation.isPending ? "Returning..." : "Return to Work"}
            </button>
          </div>
        </div>
      )}

      {/* All States Overview */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">All Processor States</h3>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading states...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      State
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Capabilities
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {processorStates?.map(state => (
                    <tr key={state.name} className={state.is_active ? "bg-green-50" : ""}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-xl mr-2">
                            {STATE_DESCRIPTIONS[state.name]?.icon || "⚙️"}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{state.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {state.is_active ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                            INACTIVE
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600 max-w-md">{state.description}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {state.capabilities?.slice(0, 3).map(cap => (
                            <span
                              key={cap}
                              className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700"
                            >
                              {cap}
                            </span>
                          ))}
                          {state.capabilities?.length > 3 && (
                            <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-500">
                              +{state.capabilities.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Information Panel */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">About Cognitive Sessions</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Dream</strong>: Memory consolidation and introspection - agent reviews and
                  strengthens learned patterns
                </li>
                <li>
                  <strong>Play</strong>: Creative exploration - agent experiments with novel
                  approaches and ideas
                </li>
                <li>
                  <strong>Solitude</strong>: Strategic reflection - agent engages in self-directed
                  planning and contemplation
                </li>
                <li>Sessions can only be initiated from the WORK state</li>
                <li>Use "Return to Work" to end a session and resume normal operation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog?.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setConfirmDialog(null)}
            />
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <span className="text-xl">
                      {STATE_DESCRIPTIONS[confirmDialog.targetState]?.icon || "🤖"}
                    </span>
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 className="text-base font-semibold leading-6 text-gray-900">
                      {confirmDialog.title}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">{confirmDialog.message}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={handleConfirmTransition}
                  disabled={transitionMutation.isPending}
                  className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto ${
                    getStateColors(confirmDialog.targetState).bg
                  } hover:opacity-90 disabled:opacity-50`}
                >
                  {transitionMutation.isPending ? "Processing..." : "Confirm"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

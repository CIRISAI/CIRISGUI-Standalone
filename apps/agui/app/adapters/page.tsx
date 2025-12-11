"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cirisClient } from "../../lib/ciris-sdk";
import type {
  AdapterInfo,
  ModuleTypeInfo,
  ModuleConfigParameter,
  ConfigurableAdapterInfo,
  ConfigSessionData,
  ConfigurationStepInfo,
  DiscoveredItem,
  ConfigOption,
} from "../../lib/ciris-sdk/resources/system";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";
import { StatusDot } from "../../components/Icons";

/**
 * AdaptersPage - Adapter Management UI
 *
 * Displays a list of adapters (Discord, API, CLI, etc.) with their status
 * and provides options to reload, remove, or add new adapters.
 * Matches the Kotlin AdaptersFragment functionality.
 */
export default function AdaptersPage() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedModule, setSelectedModule] = useState<ModuleTypeInfo | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});

  // Configuration wizard state
  const [configSession, setConfigSession] = useState<ConfigSessionData | null>(null);
  const [wizardAdapter, setWizardAdapter] = useState<ConfigurableAdapterInfo | null>(null);
  const [discoveredItems, setDiscoveredItems] = useState<DiscoveredItem[]>([]);
  const [selectOptions, setSelectOptions] = useState<ConfigOption[]>([]);

  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Fetch adapters list
  const {
    data: adaptersData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["adapters"],
    queryFn: async () => {
      const response = await cirisClient.system.getAdapters();
      return (response as any)?.data || response;
    },
    refetchInterval: 10000, // Poll every 10 seconds like Kotlin
  });

  const adapters = adaptersData?.adapters || [];
  const isConnected = !isLoading && adapters !== undefined;

  // Fetch module types for add adapter modal
  const { data: moduleTypes } = useQuery({
    queryKey: ["module-types"],
    queryFn: async () => {
      const response = await cirisClient.system.getModuleTypes();
      return response;
    },
    enabled: showAddModal,
  });

  // Fetch configurable adapters
  const { data: configurableAdapters } = useQuery({
    queryKey: ["configurable-adapters"],
    queryFn: async () => {
      const response = await cirisClient.system.getConfigurableAdapters();
      return response;
    },
    enabled: showAddModal,
  });

  // Reload adapter mutation
  const reloadMutation = useMutation({
    mutationFn: async (adapterId: string) => {
      return cirisClient.system.reloadAdapterWithConfig(adapterId);
    },
    onSuccess: () => {
      toast.success("Adapter reloaded");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reload adapter");
    },
  });

  // Remove adapter mutation
  const removeMutation = useMutation({
    mutationFn: async (adapterId: string) => {
      return cirisClient.system.unregisterAdapter(adapterId);
    },
    onSuccess: () => {
      toast.success("Adapter removed");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove adapter");
    },
  });

  // Register adapter mutation
  const registerMutation = useMutation({
    mutationFn: async ({ moduleId, config }: { moduleId: string; config: Record<string, any> }) => {
      const adapterId = `${moduleId}_${Date.now()}`;
      return cirisClient.system.registerAdapterWithConfig(moduleId, config, true, adapterId);
    },
    onSuccess: result => {
      if (result.success !== false) {
        toast.success("Adapter added successfully");
        setShowConfigModal(false);
        setSelectedModule(null);
        setConfigValues({});
        refetch();
      } else {
        toast.error(result.error || result.message || "Failed to add adapter");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add adapter");
    },
  });

  const handleReload = (adapterId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Reload Adapter",
      message: `Reload adapter ${adapterId}?`,
      onConfirm: () => {
        reloadMutation.mutate(adapterId);
        setConfirmDialog(null);
      },
    });
  };

  const handleRemove = (adapterId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Remove Adapter",
      message: `Are you sure you want to remove adapter ${adapterId}?`,
      onConfirm: () => {
        removeMutation.mutate(adapterId);
        setConfirmDialog(null);
      },
    });
  };

  const handleSelectModule = (module: ModuleTypeInfo) => {
    // Check if this module has a wizard flow
    const configurableAdapter = configurableAdapters?.adapters?.find(
      a => a.adapter_type === module.module_id
    );

    if (configurableAdapter) {
      // Use wizard flow
      startWizardFlow(configurableAdapter);
    } else {
      // Use manual form
      setSelectedModule(module);
      // Initialize config values with defaults
      const defaults: Record<string, string> = {};
      module.configuration_schema.forEach(param => {
        if (param.default !== undefined) {
          // Handle numeric defaults (Gson deserializes as Double)
          const value =
            typeof param.default === "number" && Number.isInteger(param.default)
              ? param.default.toString()
              : String(param.default);
          defaults[param.name] = value;
        }
      });
      setConfigValues(defaults);
      setShowAddModal(false);
      setShowConfigModal(true);
    }
  };

  const handleSubmitConfig = () => {
    if (!selectedModule) return;

    // Validate required fields
    const missing = selectedModule.configuration_schema
      .filter(p => p.required && !configValues[p.name])
      .map(p => p.name);

    if (missing.length > 0) {
      toast.error(`Missing required fields: ${missing.join(", ")}`);
      return;
    }

    // Convert values to appropriate types
    const typedConfig: Record<string, any> = {};
    selectedModule.configuration_schema.forEach(param => {
      const value = configValues[param.name];
      if (value) {
        switch (param.param_type) {
          case "integer":
            typedConfig[param.name] = parseInt(value, 10);
            break;
          case "float":
            typedConfig[param.name] = parseFloat(value);
            break;
          case "boolean":
            typedConfig[param.name] = ["true", "1", "yes"].includes(value.toLowerCase());
            break;
          default:
            typedConfig[param.name] = value;
        }
      }
    });

    registerMutation.mutate({
      moduleId: selectedModule.module_id,
      config: typedConfig,
    });
  };

  // ===== Configuration Wizard Functions =====

  const startWizardFlow = async (adapter: ConfigurableAdapterInfo) => {
    try {
      const session = await cirisClient.system.startConfigSession(adapter.adapter_type);
      setWizardAdapter(adapter);
      setConfigSession(session);
      setShowAddModal(false);

      // Start first step
      const step = session.current_step_info || adapter.steps?.[session.current_step];
      if (step) {
        executeWizardStep(adapter, session, step);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to start configuration");
    }
  };

  const executeWizardStep = async (
    adapter: ConfigurableAdapterInfo,
    session: ConfigSessionData,
    step: ConfigurationStepInfo
  ) => {
    switch (step.step_type) {
      case "discovery":
        await executeDiscoveryStep(adapter, session, step);
        break;
      case "select":
        await executeSelectStep(adapter, session, step);
        break;
      case "confirm":
        await executeConfirmStep(adapter, session, step);
        break;
      case "input":
        // Show input dialog
        toast(`Input step: ${step.title}`);
        break;
      case "oauth":
        // OAuth would open browser - simplified for standalone
        toast("OAuth configuration not supported in standalone mode");
        break;
    }
  };

  const executeDiscoveryStep = async (
    adapter: ConfigurableAdapterInfo,
    session: ConfigSessionData,
    step: ConfigurationStepInfo
  ) => {
    try {
      const result = await cirisClient.system.executeConfigStep(session.session_id, {
        step_type: "discovery",
        discovery_type: step.discovery_method || "auto",
      });

      const items = result.data?.discovered_items || [];
      setDiscoveredItems(items);

      if (items.length === 0) {
        toast("No items discovered. Please configure manually.");
        setWizardAdapter(null);
        setConfigSession(null);
      }
    } catch (error: any) {
      toast.error(error.message || "Discovery failed");
    }
  };

  const executeSelectStep = async (
    adapter: ConfigurableAdapterInfo,
    session: ConfigSessionData,
    step: ConfigurationStepInfo
  ) => {
    try {
      const result = await cirisClient.system.executeConfigStep(session.session_id, {
        step_type: "select",
        step_id: step.step_id,
        get_options: true,
      });

      const options = result.data?.options || [];
      setSelectOptions(options);
    } catch (error: any) {
      toast.error(error.message || "Failed to get options");
    }
  };

  const executeConfirmStep = async (
    adapter: ConfigurableAdapterInfo,
    session: ConfigSessionData,
    step: ConfigurationStepInfo
  ) => {
    try {
      const result = await cirisClient.system.executeConfigStep(session.session_id, {
        step_type: "confirm",
        get_preview: true,
      });

      const preview = result.data?.config_preview || {};
      const previewText = Object.entries(preview)
        .filter(([key]) => !key.toLowerCase().includes("token"))
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");

      setConfirmDialog({
        isOpen: true,
        title: step.title,
        message: `${step.description}\n\n${previewText || "Configuration ready"}`,
        onConfirm: async () => {
          try {
            await cirisClient.system.completeConfigSession(session.session_id, false);
            toast.success("Adapter configured successfully");
            setWizardAdapter(null);
            setConfigSession(null);
            refetch();
          } catch (error: any) {
            toast.error(error.message || "Configuration failed");
          }
          setConfirmDialog(null);
        },
      });
    } catch (error: any) {
      toast.error(error.message || "Confirm step failed");
    }
  };

  const handleDiscoverySelect = async (item: DiscoveredItem) => {
    if (!configSession || !wizardAdapter) return;

    // Build URL from metadata
    const url =
      (item.metadata?.url as string) ||
      (item.metadata?.host ? `http://${item.metadata.host}:${item.metadata.port || 8123}` : null);

    if (!url) {
      toast.error("No URL available for selected item");
      return;
    }

    // Proceed to next step with context
    const nextStepIndex = configSession.current_step + 1;
    const steps = wizardAdapter.steps || [];

    if (nextStepIndex < steps.length) {
      const updatedSession = {
        ...configSession,
        current_step: nextStepIndex,
        context: { ...configSession.context, base_url: url, selected_instance: item.id },
      };
      setConfigSession(updatedSession);
      setDiscoveredItems([]);

      const nextStep = steps[nextStepIndex];
      if (nextStep) {
        executeWizardStep(wizardAdapter, updatedSession, nextStep);
      }
    } else {
      // Complete configuration
      try {
        await cirisClient.system.completeConfigSession(configSession.session_id, false);
        toast.success("Adapter configured successfully");
        setWizardAdapter(null);
        setConfigSession(null);
        refetch();
      } catch (error: any) {
        toast.error(error.message || "Configuration failed");
      }
    }
  };

  const allModules = [...(moduleTypes?.core_modules || []), ...(moduleTypes?.adapters || [])];

  const configurableMap = new Map(
    (configurableAdapters?.adapters || []).map(a => [a.adapter_type, a])
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Adapters</h2>
              <p className="mt-1 text-sm text-gray-500">
                Manage communication adapters (Discord, API, CLI, etc.)
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                <StatusDot status={isConnected ? "green" : "red"} />
                <span
                  className={`text-sm font-medium ${isConnected ? "text-green-600" : "text-red-600"}`}
                >
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <span className="text-sm text-gray-500">{adapters.length} adapters</span>
              <button
                onClick={() => refetch()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Refresh
              </button>
              {hasRole("ADMIN") && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  + Add Adapter
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Development Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-amber-800">Feature Under Development</h3>
            <p className="text-sm text-amber-700 mt-1">
              Adapter management functionality is currently under active development. Some features
              may not work as expected or may change in future releases.
            </p>
          </div>
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
                Adapter management requires Administrator privileges. You can view adapters but
                cannot add, remove, or reload them.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Adapters List */}
      {isLoading ? (
        <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
          Loading adapters...
        </div>
      ) : adapters.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
          <p>No adapters registered</p>
          {hasRole("ADMIN") && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-indigo-600 hover:text-indigo-800"
            >
              Add your first adapter
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {adapters.map((adapter: AdapterInfo) => {
              const isRunning = adapter.is_running || adapter.status === "running";
              return (
                <li key={adapter.adapter_id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <StatusDot status={isRunning ? "green" : "red"} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {adapter.adapter_type.charAt(0).toUpperCase() +
                            adapter.adapter_type.slice(1)}
                        </p>
                        <p className="text-xs text-gray-500">ID: {adapter.adapter_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span
                        className={`text-sm font-medium ${isRunning ? "text-green-600" : "text-red-600"}`}
                      >
                        {isRunning ? "Running" : "Stopped"}
                      </span>
                      {hasRole("ADMIN") && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleReload(adapter.adapter_id)}
                            disabled={reloadMutation.isPending}
                            className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200 disabled:opacity-50"
                          >
                            Reload
                          </button>
                          <button
                            onClick={() => handleRemove(adapter.adapter_id)}
                            disabled={removeMutation.isPending}
                            className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {adapter.channels && adapter.channels.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">
                        Channels: {adapter.channels.join(", ")}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Add Adapter Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setShowAddModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Select Adapter Type</h3>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {allModules.length === 0 ? (
                  <p className="text-gray-500 text-center">Loading adapter types...</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {allModules.map(module => {
                      const isConfigurable = configurableMap.has(module.module_id);
                      const tag = isConfigurable
                        ? "[Wizard]"
                        : module.module_source === "core"
                          ? "[Core]"
                          : "[Modular]";
                      const tagColor = isConfigurable
                        ? "bg-purple-100 text-purple-800"
                        : module.module_source === "core"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800";

                      return (
                        <button
                          key={module.module_id}
                          onClick={() => handleSelectModule(module)}
                          className="flex items-start p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 text-left transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`px-2 py-0.5 text-xs font-medium rounded ${tagColor}`}
                              >
                                {tag}
                              </span>
                              <span className="font-medium text-gray-900">{module.name}</span>
                            </div>
                            <p className="mt-1 text-sm text-gray-500">{module.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configure Adapter Modal */}
      {showConfigModal && selectedModule && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => {
                setShowConfigModal(false);
                setSelectedModule(null);
              }}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Configure {selectedModule.name}
                </h3>
                <p className="mt-1 text-sm text-gray-500">{selectedModule.description}</p>
              </div>
              <div className="p-6 overflow-y-auto max-h-[50vh] space-y-4">
                {selectedModule.requires_external_deps &&
                  Object.keys(selectedModule.external_dependencies).length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                      <p className="text-sm text-amber-800">
                        Requires: {Object.keys(selectedModule.external_dependencies).join(", ")}
                      </p>
                    </div>
                  )}

                {selectedModule.configuration_schema.map(param => (
                  <div key={param.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {param.name}
                      {param.required && <span className="text-red-500 ml-1">*</span>}
                      {param.env_var && (
                        <span className="text-xs text-gray-400 ml-2">(env: {param.env_var})</span>
                      )}
                    </label>
                    <input
                      type={param.sensitivity === "HIGH" ? "password" : "text"}
                      value={configValues[param.name] || ""}
                      onChange={e =>
                        setConfigValues(prev => ({ ...prev, [param.name]: e.target.value }))
                      }
                      placeholder={param.description}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    {param.description && (
                      <p className="mt-1 text-xs text-gray-500">{param.description}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowConfigModal(false);
                    setSelectedModule(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitConfig}
                  disabled={registerMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {registerMutation.isPending ? "Adding..." : "Add Adapter"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discovery Results Modal */}
      {discoveredItems.length > 0 && wizardAdapter && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Select {wizardAdapter.name}</h3>
              </div>
              <div className="p-6 space-y-3">
                {discoveredItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleDiscoverySelect(item)}
                    className="w-full p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 text-left"
                  >
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </button>
                ))}
                <button
                  onClick={() => {
                    setDiscoveredItems([]);
                    toast("Manual URL entry not implemented yet");
                  }}
                  className="w-full p-4 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 text-center text-gray-500"
                >
                  Enter URL manually...
                </button>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => {
                    setDiscoveredItems([]);
                    setWizardAdapter(null);
                    setConfigSession(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog?.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setConfirmDialog(null)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{confirmDialog.title}</h3>
                <p className="text-sm text-gray-500 whitespace-pre-line">{confirmDialog.message}</p>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Panel */}
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
            <h3 className="text-sm font-medium text-blue-800">About Adapters</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>API Adapter</strong>: RESTful API server with OAuth2, WebSocket support
                </li>
                <li>
                  <strong>CLI Adapter</strong>: Command-line interface for direct interaction
                </li>
                <li>
                  <strong>Discord Adapter</strong>: Discord bot for community moderation
                </li>
                <li>
                  <strong>MCP Adapter</strong>: Model Context Protocol for tool integration
                </li>
                <li>Adapters marked [Wizard] have guided configuration flows</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

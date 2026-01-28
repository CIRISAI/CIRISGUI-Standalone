// CIRIS TypeScript SDK - System Resource

import { BaseResource } from "./base";
import {
  HealthStatus,
  ServiceInfo,
  ResourceUsage,
  ProcessorQueueStatus,
  RuntimeControlExtendedResponse,
  ServiceHealthStatus,
  ServicePriorityUpdateRequest,
  CircuitBreakerResetRequest,
  ServiceSelectionExplanation,
  ProcessorStateInfo,
  StateTransitionRequest,
  StateTransitionResponse,
} from "../types";

export interface RuntimeControlResponse {
  status: string;
  message: string;
  timestamp: string;
}

export interface AdapterInfo {
  adapter_id: string;
  adapter_type: string;
  is_running?: boolean;
  status?: string;
  channels?: string[];
  message_count?: number;
  error_count?: number;
  created_at?: string;
  last_activity?: string;
  config?: Record<string, any>;
  channels_count?: number;
  services_registered?: string[];
}

export interface AdapterListResponse {
  adapters: AdapterInfo[];
  total_count: number;
  running_count: number;
}

export interface AdapterOperationResult {
  success: boolean;
  adapter_id?: string;
  message: string;
  adapter_type?: string;
  error?: string;
  is_running?: boolean;
}

export interface RegisterAdapterRequest {
  config?: Record<string, any>;
  auto_start?: boolean;
}

// Module types for dynamic adapter configuration
export interface ModuleConfigParameter {
  name: string;
  param_type: string;
  default?: any;
  description: string;
  env_var?: string;
  required: boolean;
  sensitivity?: string;
}

export interface ModuleTypeInfo {
  module_id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  module_source: string;
  service_types: string[];
  capabilities: string[];
  configuration_schema: ModuleConfigParameter[];
  requires_external_deps: boolean;
  external_dependencies: Record<string, string>;
  is_mock: boolean;
  safe_domain?: string;
  prohibited: string[];
  metadata?: Record<string, any>;
}

export interface ModuleTypesResponse {
  core_modules: ModuleTypeInfo[];
  adapters: ModuleTypeInfo[];
  total_core: number;
  total_adapters: number;
}

// Configurable adapters (wizard flow)
export interface OAuthConfigInfo {
  provider_name: string;
  authorization_path: string;
  token_path: string;
  client_id_source: string;
  scopes: string[];
  pkce_required: boolean;
}

export interface ConfigurationStepInfo {
  step_id: string;
  step_type: "discovery" | "oauth" | "select" | "input" | "confirm";
  title: string;
  description: string;
  discovery_method?: string;
  oauth_config?: OAuthConfigInfo;
  depends_on: string[];
  optional: boolean;
}

export interface ConfigurableAdapterInfo {
  adapter_type: string;
  name: string;
  description: string;
  workflow_type: string;
  steps?: ConfigurationStepInfo[];
}

export interface ConfigurableAdaptersResponse {
  adapters: ConfigurableAdapterInfo[];
  total_count: number;
}

// V1.9.3: Adapter Discovery Types
export interface ToolInfo {
  name: string;
  when_to_use: string;
  description?: string;
}

export interface InstallHint {
  id: string;
  kind: "brew" | "apt" | "pip" | "npm" | "choco" | "manual";
  label: string;
  formula?: string;
  package?: string;
  command?: string;
  platforms: string[];
}

export interface AdapterAvailabilityStatus {
  name: string;
  eligible: boolean;
  eligibility_reason?: string;
  missing_binaries?: string[];
  missing_env_vars?: string[];
  missing_config?: string[];
  platform_supported?: boolean;
  can_install: boolean;
  install_hints?: InstallHint[];
  tools?: ToolInfo[];
  service_types?: string[];
}

export interface AdapterDiscoveryReport {
  eligible: AdapterAvailabilityStatus[];
  ineligible: AdapterAvailabilityStatus[];
  total_discovered: number;
  total_eligible: number;
  total_installable: number;
}

export interface AdapterInstallRequest {
  dry_run?: boolean;
  hint_id?: string;
}

export interface AdapterInstallResponse {
  success: boolean;
  message: string;
  installed_binaries?: string[];
  now_eligible: boolean;
  output?: string;
  error?: string;
}

export interface AdapterEligibilityCheckResponse {
  name: string;
  eligible: boolean;
  eligibility_reason?: string;
  missing_requirements?: string[];
}

// V1.9.3: Covenant Metrics Types
export interface CovenantMetricsConfig {
  consent_given: boolean;
  consent_timestamp?: string;
  trace_level: "detailed";  // Always detailed - no user selection
  endpoint?: string;
  batch_size?: number;
  flush_interval_seconds?: number;
}

export interface ConfigSessionData {
  session_id: string;
  status: string;
  adapter_type: string;
  current_step: number;
  current_step_info?: ConfigurationStepInfo;
  steps_completed?: string[];
  context?: Record<string, any>;
}

export interface DiscoveredItem {
  id: string;
  label: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface ConfigOption {
  id: string;
  label: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface StepExecutionResult {
  success: boolean;
  step_id?: string;
  step_type?: string;
  data?: {
    discovered_items?: DiscoveredItem[];
    oauth_url?: string;
    options?: ConfigOption[];
    config_preview?: Record<string, any>;
  };
  next_step?: number;
  message?: string;
}

export class SystemResource extends BaseResource {
  /**
   * Get system health status
   */
  async getHealth(): Promise<HealthStatus> {
    return this.transport.get<HealthStatus>("/v1/system/health");
  }

  /**
   * Get all services status
   */
  async getServices(): Promise<{
    services: ServiceInfo[];
    total_services: number;
    healthy_services: number;
    timestamp: string;
  }> {
    return this.transport.get("/v1/system/services");
  }

  /**
   * Get resource usage
   */
  async getResources(): Promise<ResourceUsage> {
    return this.transport.get<ResourceUsage>("/v1/system/resources");
  }

  /**
   * Pause runtime processing
   */
  async pauseRuntime(): Promise<
    RuntimeControlResponse & { processor_state?: string; cognitive_state?: string }
  > {
    const response = await this.transport.post("/v1/system/runtime/pause", {});
    const data = response.data || response;
    return {
      status: data.success ? "success" : "error",
      message: data.message || "Runtime paused",
      timestamp: response.metadata?.timestamp || new Date().toISOString(),
      processor_state: data.processor_state,
      cognitive_state: data.cognitive_state,
    };
  }

  /**
   * Resume runtime processing
   */
  async resumeRuntime(): Promise<
    RuntimeControlResponse & { processor_state?: string; cognitive_state?: string }
  > {
    const response = await this.transport.post("/v1/system/runtime/resume", {});
    const data = response.data || response;
    return {
      status: data.success ? "success" : "error",
      message: data.message || "Runtime resumed",
      timestamp: response.metadata?.timestamp || new Date().toISOString(),
      processor_state: data.processor_state,
      cognitive_state: data.cognitive_state,
    };
  }

  /**
   * Get runtime status
   */
  async getRuntimeStatus(): Promise<{
    is_paused: boolean;
    pause_reason?: string;
    paused_at?: string;
    paused_by?: string;
    processor_status?: string;
    health_status?: string;
    uptime_seconds?: number;
    active_adapters?: any[];
    loaded_adapters?: any[];
  }> {
    // Use the runtime state endpoint to get status
    const response = await this.transport.post("/v1/system/runtime/state", {});
    return {
      is_paused: response.processor_state === "paused",
      processor_status: response.processor_state,
      health_status: "healthy", // Not available in state endpoint
      uptime_seconds: 0, // Not available in state endpoint
      active_adapters: [],
      loaded_adapters: [],
    };
  }

  /**
   * Get runtime state
   */
  async getRuntimeState(): Promise<{
    success: boolean;
    message: string;
    processor_state: string;
    cognitive_state: string;
    queue_depth: number;
  }> {
    try {
      // Get basic information from health and queue endpoints
      const [health, queue] = await Promise.all([
        this.transport.get("/v1/system/health").catch(() => null),
        this.transport.get("/v1/system/runtime/queue").catch(() => null),
      ]);

      const healthData = health?.data || health;
      const queueData = queue?.data || queue;

      // For now, we can only determine paused state from pause/resume operations
      // This method should be called after pause/resume to get current state
      // In normal query mode, we return 'running' as default since that's the normal state
      return {
        success: true,
        message: "Runtime state retrieved",
        processor_state: "running", // Default assumption - will be updated by mutations
        cognitive_state: healthData?.cognitive_state || "work",
        queue_depth: queueData?.queue_size || 0,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to retrieve runtime state",
        processor_state: "unknown",
        cognitive_state: "work",
        queue_depth: 0,
      };
    }
  }

  /**
   * Pause a specific processor
   */
  async pauseProcessor(processorName: string, duration?: number): Promise<RuntimeControlResponse> {
    return this.transport.post<RuntimeControlResponse>(
      `/v1/system/processors/${processorName}/pause`,
      { duration }
    );
  }

  /**
   * Resume a specific processor
   */
  async resumeProcessor(processorName: string): Promise<RuntimeControlResponse> {
    return this.transport.post<RuntimeControlResponse>(
      `/v1/system/processors/${processorName}/resume`
    );
  }

  /**
   * Get all adapters
   */
  async getAdapters(): Promise<AdapterListResponse> {
    return this.transport.get<AdapterListResponse>("/v1/system/adapters");
  }

  /**
   * Get a specific adapter
   */
  async getAdapter(adapterId: string): Promise<AdapterInfo> {
    return this.transport.get<AdapterInfo>(`/v1/system/adapters/${adapterId}`);
  }

  /**
   * Register a new adapter
   */
  async registerAdapter(
    adapterType: string,
    config?: Record<string, any>
  ): Promise<AdapterOperationResult> {
    return this.transport.post<AdapterOperationResult>(`/v1/system/adapters/${adapterType}`, {
      config,
    });
  }

  /**
   * Unregister an adapter
   */
  async unregisterAdapter(adapterId: string): Promise<AdapterOperationResult> {
    return this.transport.delete<AdapterOperationResult>(`/v1/system/adapters/${adapterId}`);
  }

  /**
   * Reload an adapter
   */
  async reloadAdapter(adapterId: string): Promise<AdapterOperationResult> {
    return this.transport.put<AdapterOperationResult>(`/v1/system/adapters/${adapterId}/reload`);
  }

  /**
   * Restart a service
   */
  async restartService(serviceName: string): Promise<RuntimeControlResponse> {
    return this.transport.post<RuntimeControlResponse>(
      `/v1/system/services/${serviceName}/restart`
    );
  }

  /**
   * Pause an adapter
   */
  async pauseAdapter(adapterName: string, duration?: number): Promise<RuntimeControlResponse> {
    return this.transport.post<RuntimeControlResponse>(`/v1/system/adapters/${adapterName}/pause`, {
      duration,
    });
  }

  /**
   * Resume an adapter
   */
  async resumeAdapter(adapterName: string): Promise<RuntimeControlResponse> {
    return this.transport.post<RuntimeControlResponse>(`/v1/system/adapters/${adapterName}/resume`);
  }

  // Extended System Management Methods

  /**
   * Get processing queue status
   */
  async getProcessingQueueStatus(): Promise<ProcessorQueueStatus> {
    return this.transport.get<ProcessorQueueStatus>("/v1/system/runtime/queue");
  }

  /**
   * Execute a single processing step (basic)
   */
  async singleStepProcessor(): Promise<RuntimeControlExtendedResponse> {
    return this.transport.post<RuntimeControlExtendedResponse>("/v1/system/runtime/step");
  }

  /**
   * Execute a single processing step with enhanced detailed data
   */
  async singleStepProcessorEnhanced(
    includeDetails: boolean = true
  ): Promise<import("../types").EnhancedSingleStepResponse> {
    // Use query parameter for include_details as per API specification
    const path = includeDetails
      ? "/v1/system/runtime/step?include_details=true"
      : "/v1/system/runtime/step";
    const response = await this.transport.post(path, {});
    const data = response.data || response;

    // Transform the response to match expected format
    return {
      success: data.success || false,
      message: data.message || "Single step completed",
      step_point: data.step_point || null,
      step_result: data.step_result || null,
      processing_time_ms: data.processing_time_ms || 0,
      tokens_used: data.tokens_used || 0,
      processor_state: data.processor_state || "unknown",
      cognitive_state: data.cognitive_state || "work",
      queue_depth: data.queue_depth || 0,
      // Add new fields from v1.0.9 API
      pipeline_state: data.pipeline_state || null,
      demo_data: data.demo_data || null,
    };
  }

  /**
   * Get detailed service health status
   */
  async getServiceHealthDetails(): Promise<ServiceHealthStatus> {
    return this.transport.get<ServiceHealthStatus>("/v1/system/services/health");
  }

  /**
   * Update service provider priority
   */
  async updateServicePriority(
    providerName: string,
    update: ServicePriorityUpdateRequest
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    return this.transport.put(`/v1/system/services/${providerName}/priority`, update);
  }

  /**
   * Reset circuit breakers
   */
  async resetCircuitBreakers(
    request: CircuitBreakerResetRequest = {}
  ): Promise<{ success: boolean; message?: string; reset_count?: number }> {
    return this.transport.post("/v1/system/services/circuit-breakers/reset", request);
  }

  /**
   * Get service selection logic explanation
   */
  async getServiceSelectionExplanation(): Promise<ServiceSelectionExplanation> {
    return this.transport.get<ServiceSelectionExplanation>("/v1/system/services/selection-logic");
  }

  /**
   * Get information about all processor states
   */
  async getProcessorStates(): Promise<ProcessorStateInfo[]> {
    return this.transport.get<ProcessorStateInfo[]>("/v1/system/processors");
  }

  /**
   * Transition to a different cognitive state (WORK, DREAM, PLAY, SOLITUDE)
   */
  async transitionState(request: StateTransitionRequest): Promise<StateTransitionResponse> {
    const response = await this.transport.post<{ data: StateTransitionResponse }>(
      "/v1/system/state/transition",
      request
    );
    // Handle wrapped response
    return response.data || response;
  }

  /**
   * Get current system time
   */
  async getTime(): Promise<{
    current_time: string;
    timezone: string;
    timestamp: number;
  }> {
    return this.transport.get("/v1/system/time");
  }

  /**
   * Initiate system shutdown
   */
  async shutdown(
    reason: string,
    confirm: boolean = false,
    force: boolean = false
  ): Promise<{
    status: string;
    message: string;
    shutdown_initiated: boolean;
  }> {
    return this.transport.post("/v1/system/shutdown", { reason, confirm, force });
  }

  /**
   * Get all available tools from all providers
   */
  async getTools(): Promise<
    {
      name: string;
      description: string;
      provider: string;
      schema: any;
      category: string;
    }[]
  > {
    return this.transport.get<
      {
        name: string;
        description: string;
        provider: string;
        schema: any;
        category: string;
      }[]
    >("/v1/system/tools");
  }

  // ===== Advanced Adapter Configuration Methods =====

  /**
   * Get available module/adapter types with configuration schemas
   */
  async getModuleTypes(): Promise<ModuleTypesResponse> {
    const response = await this.transport.get<{ data: ModuleTypesResponse }>(
      "/v1/system/adapters/types"
    );
    return response.data || response;
  }

  /**
   * Get configurable adapters (those with wizard flow)
   */
  async getConfigurableAdapters(): Promise<ConfigurableAdaptersResponse> {
    const response = await this.transport.get<{ data: ConfigurableAdaptersResponse }>(
      "/v1/system/adapters/configurable"
    );
    return response.data || response;
  }

  /**
   * Start a configuration session for an adapter
   */
  async startConfigSession(adapterType: string): Promise<ConfigSessionData> {
    const response = await this.transport.post<{ data: ConfigSessionData }>(
      `/v1/system/adapters/${adapterType}/configure/start`,
      {}
    );
    return response.data || response;
  }

  /**
   * Get configuration session status
   */
  async getConfigSessionStatus(sessionId: string): Promise<ConfigSessionData> {
    const response = await this.transport.get<{ data: ConfigSessionData }>(
      `/v1/system/adapters/configure/${sessionId}/status`
    );
    return response.data || response;
  }

  /**
   * Execute a configuration step
   */
  async executeConfigStep(
    sessionId: string,
    stepData: Record<string, any>
  ): Promise<StepExecutionResult> {
    const response = await this.transport.post<{ data: StepExecutionResult }>(
      `/v1/system/adapters/configure/${sessionId}/step`,
      { step_data: stepData }
    );
    return response.data || response;
  }

  /**
   * Complete a configuration session
   */
  async completeConfigSession(
    sessionId: string,
    persist: boolean = false
  ): Promise<AdapterOperationResult> {
    const response = await this.transport.post<{ data: AdapterOperationResult }>(
      `/v1/system/adapters/configure/${sessionId}/complete`,
      { persist }
    );
    return response.data || response;
  }

  /**
   * Register adapter with auto_start option
   */
  async registerAdapterWithConfig(
    adapterType: string,
    config: Record<string, any>,
    autoStart: boolean = true,
    adapterId?: string
  ): Promise<AdapterOperationResult> {
    const url = adapterId
      ? `/v1/system/adapters/${adapterType}?adapter_id=${adapterId}`
      : `/v1/system/adapters/${adapterType}`;

    const response = await this.transport.post<{ data: AdapterOperationResult }>(url, {
      config: {
        adapter_type: adapterType,
        enabled: true,
        settings: config,
      },
      auto_start: autoStart,
    });
    return response.data || response;
  }

  /**
   * Reload adapter with configuration
   */
  async reloadAdapterWithConfig(
    adapterId: string,
    config?: Record<string, any>
  ): Promise<AdapterOperationResult> {
    const response = await this.transport.put<{ data: AdapterOperationResult }>(
      `/v1/system/adapters/${adapterId}/reload`,
      {
        config: config || {},
        auto_start: true,
      }
    );
    return response.data || response;
  }

  // ============================================
  // V1.9.3: Adapter Discovery & Installation
  // ============================================

  /**
   * Get adapter discovery report with eligibility status
   *
   * Returns all discovered adapters categorized by eligibility.
   * This endpoint works without auth during setup.
   */
  async getAvailableAdapters(): Promise<AdapterDiscoveryReport> {
    const response = await this.transport.get<AdapterDiscoveryReport>(
      "/v1/system/adapters/available"
    );
    return response;
  }

  /**
   * Install missing dependencies for an adapter
   *
   * Attempts to install binaries using system package managers.
   *
   * @param adapterName - Name of the adapter to install for
   * @param options - Installation options
   */
  async installAdapterDependencies(
    adapterName: string,
    options: AdapterInstallRequest = {}
  ): Promise<AdapterInstallResponse> {
    const response = await this.transport.post<AdapterInstallResponse>(
      `/v1/system/adapters/${adapterName}/install`,
      options
    );
    return response;
  }

  /**
   * Recheck adapter eligibility after manual installation
   *
   * @param adapterName - Name of the adapter to check
   */
  async checkAdapterEligibility(
    adapterName: string
  ): Promise<AdapterEligibilityCheckResponse> {
    const response = await this.transport.post<AdapterEligibilityCheckResponse>(
      `/v1/system/adapters/${adapterName}/check-eligibility`,
      {}
    );
    return response;
  }
}

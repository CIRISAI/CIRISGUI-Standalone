// CIRIS TypeScript SDK - Setup Resource

import { BaseResource } from "./base";
import type { AdapterDiscoveryReport } from "./system";

// Generic success response wrapper (matches backend schema)
export interface SuccessResponse<T> {
  data: T;
  metadata: {
    timestamp: string;
    request_id: string | null;
    duration_ms: number | null;
  };
}

export interface SetupStatusResponse {
  is_first_run: boolean;
  config_exists: boolean;
  config_path: string | null;
  setup_required: boolean;
}

export interface LLMProvider {
  id: string;
  name: string;
  description: string;
  requires_api_key: boolean;
  requires_base_url: boolean;
  requires_model: boolean;
  default_base_url: string | null;
  default_model: string | null;
  examples: string[];
}

export interface LLMValidationRequest {
  provider: string;
  api_key: string;
  base_url?: string | null;
  model?: string | null;
}

export interface LLMValidationResponse {
  valid: boolean;
  message: string;
  error?: string | null;
}

// V1.9.5: Live model listing types
export interface ModelCapabilities {
  supports_tools: boolean;
  supports_streaming: boolean;
  supports_json_mode: boolean;
  supports_system_prompt: boolean;
  supports_vision: boolean;
}

export interface LiveModelInfo {
  id: string;
  display_name: string;
  ciris_compatible: boolean | null; // true = compatible, false = incompatible, null = unknown
  ciris_recommended: boolean;
  tier: string | null; // "default", "fast", "fallback", "premium", "legacy"
  capabilities: ModelCapabilities | null;
  context_window: number | null;
  notes: string | null;
  source: string; // "live", "static", or "both"
}

export interface ListModelsResponse {
  provider: string;
  models: LiveModelInfo[];
  total_count: number;
  source: string; // "live" (API queried) or "static" (fallback)
  error: string | null; // If live query failed, contains error message
}

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  identity: string;
  example_use_cases: string[];
  supported_sops: string[];
  // Book VI Stewardship
  stewardship_tier: number; // 1-5, higher = more oversight
  creator_id: string;
  signature: string;
}

export interface AdapterConfig {
  id: string;
  name: string;
  description: string;
  enabled_by_default: boolean;
  required_env_vars: string[];
  optional_env_vars: string[];
}

export interface SetupCompleteRequest {
  // Primary LLM Configuration
  llm_provider: string;
  llm_api_key: string;
  llm_base_url?: string | null;
  llm_model?: string | null;

  // Backup/Secondary LLM Configuration (Optional)
  backup_llm_api_key?: string | null;
  backup_llm_base_url?: string | null;
  backup_llm_model?: string | null;

  // Template Selection
  template_id: string;

  // Adapter Configuration
  enabled_adapters: string[];
  adapter_config: Record<string, any>;

  // V1.9.3: Covenant Metrics Configuration
  covenant_metrics_consent?: boolean;
  covenant_metrics_consent_timestamp?: string;

  // Dual Password System
  admin_username: string;
  admin_password: string;
  system_admin_password?: string | null;

  // Application Configuration
  agent_port: number;
}

export interface SetupCompleteResponse {
  status: string;
  message: string;
  config_path: string;
  username: string;
  next_steps: string;
}

export interface SetupConfigResponse {
  // Primary LLM Configuration
  llm_provider?: string | null;
  llm_base_url?: string | null;
  llm_model?: string | null;
  llm_api_key_set: boolean;

  // Backup/Secondary LLM Configuration
  backup_llm_base_url?: string | null;
  backup_llm_model?: string | null;
  backup_llm_api_key_set: boolean;

  // Template
  template_id?: string | null;
  enabled_adapters: string[];
  agent_port: number;
}

/**
 * Setup Resource
 *
 * Handles first-run setup wizard for CIRIS standalone deployments.
 * This resource is used before authentication is configured.
 */
export class SetupResource extends BaseResource {
  /**
   * Check if setup is complete
   *
   * This endpoint is unauthenticated and can be called before login.
   *
   * @returns Setup status
   */
  async getStatus(): Promise<SetupStatusResponse> {
    return this.transport.get<SetupStatusResponse>("/v1/setup/status");
  }

  /**
   * Get available LLM providers
   *
   * Returns list of supported LLM providers and their configuration requirements.
   *
   * @returns List of LLM providers
   */
  async getProviders(): Promise<LLMProvider[]> {
    return this.transport.get<LLMProvider[]>("/v1/setup/providers");
  }

  /**
   * Validate LLM configuration
   *
   * Tests the provided LLM credentials by making a test API call.
   *
   * @param config - LLM configuration to validate
   * @returns Validation result
   */
  async validateLLM(config: LLMValidationRequest): Promise<LLMValidationResponse> {
    return this.transport.post<LLMValidationResponse>("/v1/setup/validate-llm", config);
  }

  /**
   * List available models from a provider's live API (v1.9.5)
   *
   * Queries the provider's models API using the provided credentials,
   * then cross-references with CIRIS compatibility annotations.
   * Falls back to static capabilities data if the live query fails.
   *
   * Models are sorted: recommended > compatible > unknown > incompatible.
   *
   * @param config - LLM configuration with provider and API key
   * @returns List of models with CIRIS compatibility annotations
   */
  async listModels(config: LLMValidationRequest): Promise<ListModelsResponse> {
    const response = await this.transport.post<SuccessResponse<ListModelsResponse>>(
      "/v1/setup/list-models",
      config
    );
    return response.data;
  }

  /**
   * Get available agent templates
   *
   * Returns list of pre-configured agent templates with their identities and use cases.
   *
   * @returns List of agent templates
   */
  async getTemplates(): Promise<AgentTemplate[]> {
    return this.transport.get<AgentTemplate[]>("/v1/setup/templates");
  }

  /**
   * Get available communication adapters
   *
   * Returns list of available adapters (API, CLI, Discord, Reddit, etc.)
   * with their configuration requirements.
   *
   * @returns List of adapter configurations
   */
  async getAdapters(): Promise<AdapterConfig[]> {
    return this.transport.get<AdapterConfig[]>("/v1/setup/adapters");
  }

  /**
   * Get available adapters with eligibility status (no auth required)
   *
   * Returns both eligible (ready to use) and ineligible (missing requirements)
   * adapters, including installation hints for ineligible adapters.
   * This is the setup-wizard equivalent of system.getAvailableAdapters().
   *
   * @returns Adapter discovery report with eligibility status
   */
  async getAvailableAdapters(): Promise<AdapterDiscoveryReport> {
    return this.transport.get<AdapterDiscoveryReport>("/v1/setup/adapters/available");
  }

  /**
   * Complete setup wizard
   *
   * Saves configuration, creates new admin user, and optionally updates
   * system admin password. Only accessible during first-run.
   *
   * @param config - Complete setup configuration including dual password system
   * @returns Setup result with next steps
   */
  async complete(config: SetupCompleteRequest): Promise<SetupCompleteResponse> {
    return this.transport.post<SetupCompleteResponse>("/v1/setup/complete", config);
  }

  /**
   * Get current configuration
   *
   * Returns current configuration for editing/viewing.
   * Requires admin authentication if setup is already complete.
   *
   * @returns Current configuration (API key never returned, only llm_api_key_set flag)
   */
  async getConfig(): Promise<SetupConfigResponse> {
    return this.transport.get<SetupConfigResponse>("/v1/setup/config");
  }

  /**
   * Update configuration
   *
   * Updates configuration after initial setup. Requires admin authentication.
   * Agent must be restarted after config update.
   *
   * @param config - Updated configuration
   * @returns Update result with next steps
   */
  async updateConfig(config: SetupCompleteRequest): Promise<SetupCompleteResponse> {
    return this.transport.put<SetupCompleteResponse>("/v1/setup/config", config);
  }
}

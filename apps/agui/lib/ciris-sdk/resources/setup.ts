// CIRIS TypeScript SDK - Setup Resource

import { BaseResource } from "./base";

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
  // LLM Configuration
  llm_provider: string;
  llm_api_key: string;
  llm_base_url?: string | null;
  llm_model?: string | null;

  // Template Selection
  template_id: string;

  // Adapter Configuration
  enabled_adapters: string[];
  adapter_config: Record<string, any>;

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
  llm_provider?: string | null;
  llm_base_url?: string | null;
  llm_model?: string | null;
  llm_api_key_set: boolean;
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
  async getStatus(): Promise<SuccessResponse<SetupStatusResponse>> {
    return this.transport.get<SuccessResponse<SetupStatusResponse>>("/v1/setup/status");
  }

  /**
   * Get available LLM providers
   *
   * Returns list of supported LLM providers and their configuration requirements.
   *
   * @returns List of LLM providers
   */
  async getProviders(): Promise<SuccessResponse<LLMProvider[]>> {
    return this.transport.get<SuccessResponse<LLMProvider[]>>("/v1/setup/providers");
  }

  /**
   * Validate LLM configuration
   *
   * Tests the provided LLM credentials by making a test API call.
   *
   * @param config - LLM configuration to validate
   * @returns Validation result
   */
  async validateLLM(config: LLMValidationRequest): Promise<SuccessResponse<LLMValidationResponse>> {
    return this.transport.post<SuccessResponse<LLMValidationResponse>>(
      "/v1/setup/validate-llm",
      config
    );
  }

  /**
   * Get available agent templates
   *
   * Returns list of pre-configured agent templates with their identities and use cases.
   *
   * @returns List of agent templates
   */
  async getTemplates(): Promise<SuccessResponse<AgentTemplate[]>> {
    return this.transport.get<SuccessResponse<AgentTemplate[]>>("/v1/setup/templates");
  }

  /**
   * Get available communication adapters
   *
   * Returns list of available adapters (API, CLI, Discord, Reddit, etc.)
   * with their configuration requirements.
   *
   * @returns List of adapter configurations
   */
  async getAdapters(): Promise<SuccessResponse<AdapterConfig[]>> {
    return this.transport.get<SuccessResponse<AdapterConfig[]>>("/v1/setup/adapters");
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
  async complete(config: SetupCompleteRequest): Promise<SuccessResponse<SetupCompleteResponse>> {
    return this.transport.post<SuccessResponse<SetupCompleteResponse>>(
      "/v1/setup/complete",
      config
    );
  }

  /**
   * Get current configuration
   *
   * Returns current configuration for editing/viewing.
   * Requires admin authentication if setup is already complete.
   *
   * @returns Current configuration (API key never returned, only llm_api_key_set flag)
   */
  async getConfig(): Promise<SuccessResponse<SetupConfigResponse>> {
    return this.transport.get<SuccessResponse<SetupConfigResponse>>("/v1/setup/config");
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
  async updateConfig(
    config: SetupCompleteRequest
  ): Promise<SuccessResponse<SetupCompleteResponse>> {
    return this.transport.put<SuccessResponse<SetupCompleteResponse>>("/v1/setup/config", config);
  }
}

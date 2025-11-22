// CIRIS TypeScript SDK - Setup Resource

import { BaseResource } from "./base";

export interface SetupStatus {
  setup_complete: boolean;
  first_run: boolean;
  setup_required?: string[];
}

export interface LLMProvider {
  provider: string;
  name: string;
  models: string[];
  env_vars_required: string[];
  supports_streaming: boolean;
}

export interface LLMValidationRequest {
  provider: string;
  api_key: string;
  model?: string;
  api_base?: string;
}

export interface LLMValidationResponse {
  valid: boolean;
  message: string;
  model_tested?: string;
  error?: string;
}

export interface AgentTemplate {
  template_id: string;
  name: string;
  description: string;
  sops: string[];
  recommended_for: string[];
}

export interface SetupCompleteRequest {
  llm_provider: string;
  llm_api_key: string;
  llm_model?: string;
  llm_api_base?: string;
  admin_password: string;
  username: string;
  password: string;
  agent_template?: string;
}

export interface SetupCompleteResponse {
  success: boolean;
  message: string;
  admin_user_id: string;
  user_id: string;
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
  async getStatus(): Promise<SetupStatus> {
    return this.transport.get<SetupStatus>("/v1/setup/status");
  }

  /**
   * Get available LLM providers
   *
   * Returns list of supported LLM providers and their configuration requirements.
   *
   * @returns List of LLM providers
   */
  async getProviders(): Promise<{ providers: LLMProvider[] }> {
    return this.transport.get<{ providers: LLMProvider[] }>("/v1/setup/providers");
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
   * Get available agent templates
   *
   * Returns list of pre-configured agent templates with their SOPs.
   *
   * @returns List of agent templates
   */
  async getTemplates(): Promise<{ templates: AgentTemplate[] }> {
    return this.transport.get<{ templates: AgentTemplate[] }>("/v1/setup/templates");
  }

  /**
   * Complete setup wizard
   *
   * Saves configuration, creates admin user, and creates first user account.
   *
   * @param config - Complete setup configuration
   * @returns Setup result with user IDs
   */
  async complete(config: SetupCompleteRequest): Promise<SetupCompleteResponse> {
    return this.transport.post<SetupCompleteResponse>("/v1/setup/complete", config);
  }
}

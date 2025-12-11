"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cirisClient } from "../../lib/ciris-sdk";
import type {
  LLMProvider,
  AgentTemplate,
  SetupCompleteRequest,
} from "../../lib/ciris-sdk/resources/setup";
import LogoIcon from "../../components/ui/floating/LogoIcon";
import toast from "react-hot-toast";

// Simplified wizard: 3 steps - no template selection (force ally), no adapter config (default to api)
type Step = "welcome" | "llm" | "users" | "complete";

export default function SetupWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state - Primary LLM
  const [selectedProvider, setSelectedProvider] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [apiBase, setApiBase] = useState("");
  const [validatingLLM, setValidatingLLM] = useState(false);
  const [llmValid, setLlmValid] = useState(false);

  // Backup/Secondary LLM (Optional)
  const [enableBackupLLM, setEnableBackupLLM] = useState(false);
  const [backupApiKey, setBackupApiKey] = useState("");
  const [backupModel, setBackupModel] = useState("");
  const [backupApiBase, setBackupApiBase] = useState("");

  // User account state
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState("");
  const [adminPasswordError, setAdminPasswordError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [userPasswordError, setUserPasswordError] = useState<string | null>(null);

  // Force "ally" template - no user selection
  const selectedTemplate = "ally";

  // Load providers and templates
  useEffect(() => {
    loadProvidersAndTemplates();
  }, []);

  const loadProvidersAndTemplates = async () => {
    try {
      const [providersRes, templatesRes] = await Promise.all([
        cirisClient.setup.getProviders(),
        cirisClient.setup.getTemplates(),
      ]);
      setProviders(providersRes);
      setTemplates(templatesRes);
      if (providersRes.length > 0) {
        setSelectedProvider(providersRes[0].id);
      }
    } catch (error) {
      console.error("Failed to load setup data:", error);
      toast.error("Failed to load setup data");
    }
  };

  const validateLLM = async () => {
    if (!selectedProvider) {
      toast.error("Please select a provider");
      return;
    }

    const currentProvider = providers.find(p => p.id === selectedProvider);
    if (currentProvider?.requires_api_key && !apiKey) {
      toast.error("API key is required for this provider");
      return;
    }
    if (currentProvider?.requires_base_url && !apiBase) {
      toast.error("Base URL is required for this provider");
      return;
    }
    if (currentProvider?.requires_model && !selectedModel) {
      toast.error("Model name is required for this provider");
      return;
    }

    setValidatingLLM(true);
    try {
      const response = await cirisClient.setup.validateLLM({
        provider: selectedProvider,
        api_key: apiKey,
        base_url: apiBase || null,
        model: selectedModel || null,
      });

      if (response.valid) {
        setLlmValid(true);
        toast.success(response.message || "LLM configuration validated!");
      } else {
        setLlmValid(false);
        toast.error(response.error || "LLM validation failed");
      }
    } catch (error: unknown) {
      setLlmValid(false);
      const errorMessage = error instanceof Error ? error.message : "Failed to validate LLM";
      toast.error(errorMessage);
    } finally {
      setValidatingLLM(false);
    }
  };

  const completeSetup = async () => {
    // Validate admin password
    if (adminPassword !== adminPasswordConfirm) {
      toast.error("Admin passwords do not match");
      return;
    }
    if (adminPassword.length < 8) {
      toast.error("Admin password must be at least 8 characters");
      return;
    }
    // Validate user passwords
    if (password !== passwordConfirm) {
      toast.error("User passwords do not match");
      return;
    }
    if (password.length < 8) {
      toast.error("User password must be at least 8 characters");
      return;
    }
    if (!llmValid) {
      toast.error("Please validate your LLM configuration first");
      return;
    }

    setLoading(true);
    try {
      const config: SetupCompleteRequest = {
        llm_provider: selectedProvider,
        llm_api_key: apiKey,
        llm_base_url: apiBase || null,
        llm_model: selectedModel || null,
        // Backup LLM (optional)
        backup_llm_api_key: enableBackupLLM && backupApiKey ? backupApiKey : null,
        backup_llm_base_url: enableBackupLLM && backupApiBase ? backupApiBase : null,
        backup_llm_model: enableBackupLLM && backupModel ? backupModel : null,
        template_id: selectedTemplate,
        enabled_adapters: ["api"], // Default to just API adapter
        adapter_config: {},
        admin_username: username,
        admin_password: password,
        system_admin_password: adminPassword,
        agent_port: 8080,
      };

      const response = await cirisClient.setup.complete(config);
      console.log("Setup complete:", response.message);

      // Save the selected agent template name for AgentContext to use
      const selectedTemplateObj = templates.find(t => t.id === selectedTemplate);
      if (selectedTemplateObj) {
        localStorage.setItem("selectedAgentName", selectedTemplateObj.name);
        localStorage.setItem("selectedAgentId", selectedTemplateObj.id);
      }

      setCurrentStep("complete");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Setup failed";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let randomPassword = "";
    for (let i = 0; i < 16; i++) {
      randomPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAdminPassword(randomPassword);
    setAdminPasswordConfirm(randomPassword);
    setAdminPasswordError(null);
    // Copy to clipboard
    navigator.clipboard
      .writeText(randomPassword)
      .then(() => {
        toast.success("Random password generated and copied to clipboard!");
      })
      .catch(() => {
        toast.success(`Random password generated: ${randomPassword}`);
      });
  };

  const provider = providers.find(p => p.id === selectedProvider);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <LogoIcon className="mx-auto h-16 w-auto text-brand-primary fill-brand-primary mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome to CIRIS</h1>
        </div>

        {/* Progress indicator - 3 steps */}
        {currentStep !== "complete" && (
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-2 sm:space-x-4">
              {["welcome", "llm", "users"].map((step, idx) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-sm sm:text-base ${
                      currentStep === step
                        ? "bg-indigo-600 text-white"
                        : idx < ["welcome", "llm", "users"].indexOf(currentStep)
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {idx < ["welcome", "llm", "users"].indexOf(currentStep) ? "✓" : idx + 1}
                  </div>
                  {idx < 2 && (
                    <div
                      className={`w-8 sm:w-16 h-1 ${
                        idx < ["welcome", "llm", "users"].indexOf(currentStep)
                          ? "bg-green-500"
                          : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main content card */}
        <div className="bg-white rounded-xl shadow-xl p-8">
          {/* Step 1: Welcome */}
          {currentStep === "welcome" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Let's Get Started</h2>
              <div className="prose prose-indigo max-w-none">
                <p className="text-gray-700 leading-relaxed">
                  CIRIS is a next-generation AI assistant that prioritizes cognitive integrity,
                  transparency, and ethical decision-making. This setup wizard will help you
                  configure your instance in just a few steps.
                </p>

                <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">
                  What you'll configure:
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="text-indigo-600 mr-2">•</span>
                    <span>
                      <strong>LLM API Key</strong> - An API key from OpenAI, Anthropic, or another
                      supported provider
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-600 mr-2">•</span>
                    <span>
                      <strong>Admin Password</strong> - A secure password (min 8 characters) for the
                      default admin account
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-600 mr-2">•</span>
                    <span>
                      <strong>Your Account</strong> - Username and password for your personal
                      account
                    </span>
                  </li>
                </ul>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                  <p className="text-sm text-blue-900">
                    <strong>Note:</strong> All data is stored locally on your machine. Your API keys
                    and passwords are encrypted and never shared.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setCurrentStep("llm")}
                className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Continue to LLM Setup →
              </button>
            </div>
          )}

          {/* Step 2: LLM Configuration */}
          {currentStep === "llm" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Configure Your LLM</h2>
                <button
                  onClick={() => setCurrentStep("welcome")}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ← Back
                </button>
              </div>

              <p className="text-gray-600">
                Choose your preferred LLM provider and enter your API credentials. We'll test the
                connection to make sure everything works.
              </p>

              {/* Provider selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
                <div className="grid grid-cols-2 gap-4">
                  {providers.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProvider(p.id);
                        setLlmValid(false);
                      }}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        selectedProvider === p.id
                          ? "border-indigo-600 bg-indigo-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="font-semibold text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{p.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* API Key */}
              {provider && provider.requires_api_key && (
                <div>
                  <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                    API Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={e => {
                      setApiKey(e.target.value);
                      setLlmValid(false);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="sk-..."
                    required
                  />
                </div>
              )}

              {/* Model input */}
              {provider && provider.requires_model && (
                <div>
                  <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
                    Model Name {provider.requires_model && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    id="model"
                    type="text"
                    value={selectedModel}
                    onChange={e => {
                      setSelectedModel(e.target.value);
                      setLlmValid(false);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder={provider.default_model || "Enter model name"}
                  />
                  {provider.examples.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      Examples: {provider.examples.slice(0, 2).join(", ")}
                    </p>
                  )}
                </div>
              )}

              {/* API Base URL */}
              {provider && provider.requires_base_url && (
                <div>
                  <label htmlFor="apiBase" className="block text-sm font-medium text-gray-700 mb-2">
                    API Base URL{" "}
                    {provider.requires_base_url && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    id="apiBase"
                    type="text"
                    value={apiBase}
                    onChange={e => {
                      setApiBase(e.target.value);
                      setLlmValid(false);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder={provider.default_base_url || "http://localhost:11434"}
                    required={provider.requires_base_url}
                  />
                  {provider.examples.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">{provider.examples[0]}</p>
                  )}
                </div>
              )}

              {/* Validation */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={validateLLM}
                  disabled={validatingLLM || !selectedProvider}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {validatingLLM ? "Testing..." : "Test Connection"}
                </button>
                {llmValid && <span className="text-green-600 font-medium">✓ Connected</span>}
              </div>

              {/* Optional Backup LLM Configuration */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Backup LLM{" "}
                      <span className="text-sm font-normal text-gray-500">(Optional)</span>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Configure a secondary LLM provider for redundancy
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnableBackupLLM(!enableBackupLLM)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      enableBackupLLM
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {enableBackupLLM ? "Enabled" : "Enable"}
                  </button>
                </div>

                {enableBackupLLM && (
                  <div className="space-y-4 pl-4 border-l-2 border-indigo-200">
                    {/* Backup API Key */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Backup API Key
                      </label>
                      <input
                        type="password"
                        value={backupApiKey}
                        onChange={e => setBackupApiKey(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Backup LLM API key"
                      />
                    </div>

                    {/* Backup Model */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Backup Model <span className="text-gray-500">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={backupModel}
                        onChange={e => setBackupModel(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Model name"
                      />
                    </div>

                    {/* Backup Base URL */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Backup Base URL <span className="text-gray-500">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={backupApiBase}
                        onChange={e => setBackupApiBase(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="https://api.openai.com/v1"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setCurrentStep("users")}
                disabled={!llmValid}
                className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Continue to User Setup →
              </button>
            </div>
          )}

          {/* Step 3: User & Admin Setup */}
          {currentStep === "users" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Create Your Accounts</h2>
                <button
                  onClick={() => setCurrentStep("llm")}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ← Back
                </button>
              </div>

              <p className="text-gray-600">
                First, set a secure password for the default admin account. Then create your
                personal user account.
              </p>

              {/* Admin Password */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Account</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label
                        htmlFor="adminPassword"
                        className="block text-sm font-medium text-gray-700"
                      >
                        New Admin Password{" "}
                        <span className="text-xs text-gray-500">(min 8 characters)</span>
                      </label>
                      <button
                        type="button"
                        onClick={generateRandomPassword}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Generate Random
                      </button>
                    </div>
                    <input
                      id="adminPassword"
                      type="password"
                      value={adminPassword}
                      onChange={e => {
                        setAdminPassword(e.target.value);
                        if (e.target.value.length > 0 && e.target.value.length < 8) {
                          setAdminPasswordError("Password must be at least 8 characters");
                        } else {
                          setAdminPasswordError(null);
                        }
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                        adminPasswordError ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="Enter a secure password (min 8 chars)"
                    />
                    {adminPasswordError && (
                      <p className="mt-1 text-sm text-red-600">{adminPasswordError}</p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="adminPasswordConfirm"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Confirm Admin Password
                    </label>
                    <input
                      id="adminPasswordConfirm"
                      type="password"
                      value={adminPasswordConfirm}
                      onChange={e => setAdminPasswordConfirm(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Re-enter password"
                    />
                  </div>
                </div>
              </div>

              {/* User Account */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Account</h3>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="username"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Username
                    </label>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="your_username"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Password <span className="text-xs text-gray-500">(min 8 characters)</span>
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={e => {
                        setPassword(e.target.value);
                        if (e.target.value.length > 0 && e.target.value.length < 8) {
                          setUserPasswordError("Password must be at least 8 characters");
                        } else {
                          setUserPasswordError(null);
                        }
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                        userPasswordError ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="Enter your password (min 8 chars)"
                    />
                    {userPasswordError && (
                      <p className="mt-1 text-sm text-red-600">{userPasswordError}</p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="passwordConfirm"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Confirm Password
                    </label>
                    <input
                      id="passwordConfirm"
                      type="password"
                      value={passwordConfirm}
                      onChange={e => setPasswordConfirm(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Re-enter your password"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={completeSetup}
                disabled={
                  loading ||
                  !adminPassword ||
                  adminPassword.length < 8 ||
                  adminPassword !== adminPasswordConfirm ||
                  !username ||
                  !password ||
                  password.length < 8 ||
                  password !== passwordConfirm
                }
                className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? "Completing Setup..." : "Complete Setup"}
              </button>
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === "complete" && (
            <div className="text-center space-y-6 py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-4xl">✓</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Setup Complete!</h2>
              <p className="text-gray-600 max-w-md mx-auto">
                Your CIRIS instance is now configured and ready to use. You can log in with your
                credentials.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Go to Login →
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">CIRIS v1.0 • Standalone Mode</div>
      </div>
    </div>
  );
}

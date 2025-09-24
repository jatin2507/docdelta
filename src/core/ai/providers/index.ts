// Export all providers and related types
export * from './base';
export * from './factory';
export * from './manager';

// Export individual providers
export { OpenAIProvider } from './openai';
export { AnthropicProvider } from './anthropic';
export { GoogleGeminiProvider } from './google-gemini';
export { GitHubCopilotProvider } from './github-copilot';
export { OllamaProvider } from './ollama';
export { LiteLLMProvider } from './litellm';
export { GrokProvider } from './grok';

// Re-export AIProvider enum for convenience
import { AIProvider } from './base';
export { AIProvider };

// Export a helper to list all available providers
export const ALL_PROVIDERS = [
  AIProvider.OPENAI,
  AIProvider.ANTHROPIC,
  AIProvider.GOOGLE_GEMINI,
  AIProvider.GITHUB_COPILOT,
  AIProvider.OLLAMA,
  AIProvider.LITELLM,
  AIProvider.GROK,
];

// Export provider categories
export const CLOUD_PROVIDERS = [
  AIProvider.OPENAI,
  AIProvider.ANTHROPIC,
  AIProvider.GOOGLE_GEMINI,
  AIProvider.GITHUB_COPILOT,
  AIProvider.GROK,
];

export const LOCAL_PROVIDERS = [
  AIProvider.OLLAMA,
  AIProvider.LITELLM,
];

export const CODE_SPECIALIZED_PROVIDERS = [
  AIProvider.GITHUB_COPILOT,
  AIProvider.GROK,
];
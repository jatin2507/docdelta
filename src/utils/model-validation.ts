
// Auto-generated model validation - DO NOT EDIT MANUALLY
export const SUPPORTED_MODELS: Record<string, any> = {
  "openai": {
    "provider": "OpenAI",
    "models": {
      "gpt-4o": {
        "name": "GPT-4o",
        "context": "128k",
        "version": "latest",
        "capabilities": [
          "text",
          "vision",
          "code"
        ]
      },
      "gpt-4o-mini": {
        "name": "GPT-4o Mini",
        "context": "128k",
        "version": "latest",
        "capabilities": [
          "text",
          "code"
        ]
      },
      "gpt-4-turbo": {
        "name": "GPT-4 Turbo",
        "context": "128k",
        "version": "gpt-4-turbo-2024-04-09",
        "capabilities": [
          "text",
          "vision",
          "code"
        ]
      }
    }
  },
  "anthropic": {
    "provider": "Anthropic",
    "models": {
      "claude-3-5-sonnet-20241022": {
        "name": "Claude 3.5 Sonnet",
        "context": "200k",
        "version": "20241022",
        "capabilities": [
          "text",
          "code",
          "reasoning"
        ]
      },
      "claude-3-5-haiku-20241022": {
        "name": "Claude 3.5 Haiku",
        "context": "200k",
        "version": "20241022",
        "capabilities": [
          "text",
          "code"
        ]
      },
      "claude-3-opus-20240229": {
        "name": "Claude 3 Opus",
        "context": "200k",
        "version": "20240229",
        "capabilities": [
          "text",
          "code",
          "reasoning"
        ]
      }
    }
  },
  "google-gemini": {
    "provider": "Google",
    "models": {
      "gemini-2.0-flash-exp": {
        "name": "Gemini 2.0 Flash (Experimental)",
        "context": "1M",
        "version": "2.0-flash-exp",
        "capabilities": [
          "text",
          "vision",
          "code"
        ]
      },
      "gemini-1.5-pro": {
        "name": "Gemini 1.5 Pro",
        "context": "2M",
        "version": "1.5-pro",
        "capabilities": [
          "text",
          "vision",
          "code"
        ]
      },
      "gemini-1.5-flash": {
        "name": "Gemini 1.5 Flash",
        "context": "1M",
        "version": "1.5-flash",
        "capabilities": [
          "text",
          "vision",
          "code"
        ]
      }
    }
  },
  "xai-grok": {
    "provider": "xAI",
    "models": {
      "grok-beta": {
        "name": "Grok Beta",
        "context": "131k",
        "version": "beta",
        "capabilities": [
          "text",
          "code",
          "search"
        ]
      },
      "grok-vision-beta": {
        "name": "Grok Vision Beta",
        "context": "8k",
        "version": "vision-beta",
        "capabilities": [
          "text",
          "vision",
          "code"
        ]
      }
    }
  },
  "ollama": {
    "provider": "Ollama",
    "models": {
      "llama3.2": {
        "name": "Llama 3.2",
        "context": "128k",
        "version": "3.2",
        "capabilities": [
          "text",
          "code"
        ]
      },
      "codellama": {
        "name": "Code Llama",
        "context": "100k",
        "version": "latest",
        "capabilities": [
          "code"
        ]
      },
      "qwen2.5-coder": {
        "name": "Qwen 2.5 Coder",
        "context": "32k",
        "version": "2.5",
        "capabilities": [
          "code",
          "text"
        ]
      }
    }
  }
};

export function validateModel(provider: string, model: string): boolean {
  const providerData = SUPPORTED_MODELS[provider];
  return providerData && providerData.models[model] !== undefined;
}

export function getProviderModels(provider: string): string[] {
  const providerData = SUPPORTED_MODELS[provider];
  return providerData ? Object.keys(providerData.models) : [];
}

export function getModelInfo(provider: string, model: string) {
  const providerData = SUPPORTED_MODELS[provider];
  return providerData?.models[model] || null;
}

export function getLatestModel(provider: string): string | null {
  const models = getProviderModels(provider);
  return models.length > 0 ? models[0] : null;
}

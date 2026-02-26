import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiGet, apiPut } from "@/lib/api";

interface UserSettings {
  llm_base_url: string | null;
  llm_model: string | null;
}

interface SettingsDefaults {
  llm_base_url: string;
  llm_model: string;
}

const PROVIDERS = [
  { label: "OpenRouter", value: "https://openrouter.ai/api/v1" },
  { label: "OpenAI", value: "https://api.openai.com/v1" },
  { label: "Custom", value: "__custom__" },
] as const;

const MODELS_BY_PROVIDER: Record<string, { label: string; value: string }[]> = {
  "https://openrouter.ai/api/v1": [
    { label: "Claude Sonnet 4", value: "anthropic/claude-sonnet-4" },
    { label: "GPT-4.1", value: "openai/gpt-4.1" },
    { label: "Gemini 2.5 Flash", value: "google/gemini-2.5-flash" },
    { label: "Custom", value: "__custom__" },
  ],
  "https://api.openai.com/v1": [
    { label: "GPT-4.1", value: "gpt-4.1" },
    { label: "GPT-4.1 Mini", value: "gpt-4.1-mini" },
    { label: "o4-mini", value: "o4-mini" },
    { label: "Custom", value: "__custom__" },
  ],
};

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [defaults, setDefaults] = useState<SettingsDefaults | null>(null);
  const [providerValue, setProviderValue] = useState<string>("");
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [modelValue, setModelValue] = useState<string>("");
  const [customModel, setCustomModel] = useState("");
  const [saving, setSaving] = useState(false);

  // Load settings + defaults when dialog opens
  useEffect(() => {
    if (!open) return;

    Promise.all([
      apiGet<UserSettings>("/api/settings"),
      apiGet<SettingsDefaults>("/api/settings/defaults"),
    ]).then(([userSettings, serverDefaults]) => {
      setDefaults(serverDefaults);

      const baseUrl = userSettings.llm_base_url || serverDefaults.llm_base_url;
      const model = userSettings.llm_model || serverDefaults.llm_model;

      // Determine provider selection
      const knownProvider = PROVIDERS.find((p) => p.value === baseUrl);
      if (knownProvider) {
        setProviderValue(baseUrl);
      } else {
        setProviderValue("__custom__");
        setCustomBaseUrl(baseUrl);
      }

      // Determine model selection
      const modelsForProvider = MODELS_BY_PROVIDER[baseUrl];
      const knownModel = modelsForProvider?.find((m) => m.value === model);
      if (knownModel) {
        setModelValue(model);
      } else {
        setModelValue("__custom__");
        setCustomModel(model);
      }
    });
  }, [open]);

  const effectiveBaseUrl =
    providerValue === "__custom__" ? customBaseUrl : providerValue;
  const effectiveModel =
    modelValue === "__custom__" ? customModel : modelValue;

  const modelsForCurrentProvider = MODELS_BY_PROVIDER[effectiveBaseUrl] || [];
  const isCustomProvider = providerValue === "__custom__";

  const handleProviderChange = (value: string) => {
    setProviderValue(value);
    // Reset model when provider changes
    setModelValue("");
    setCustomModel("");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Send null if matching server defaults to mean "use default"
      const baseUrlToSave =
        effectiveBaseUrl === defaults?.llm_base_url ? null : effectiveBaseUrl;
      const modelToSave =
        effectiveModel === defaults?.llm_model ? null : effectiveModel;

      await apiPut("/api/settings", {
        llm_base_url: baseUrlToSave,
        llm_model: modelToSave,
      });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await apiPut("/api/settings", {
        llm_base_url: null,
        llm_model: null,
      });
      if (defaults) {
        const knownProvider = PROVIDERS.find(
          (p) => p.value === defaults.llm_base_url
        );
        setProviderValue(knownProvider ? defaults.llm_base_url : "__custom__");
        setCustomBaseUrl(knownProvider ? "" : defaults.llm_base_url);

        const modelsForDefault = MODELS_BY_PROVIDER[defaults.llm_base_url];
        const knownModel = modelsForDefault?.find(
          (m) => m.value === defaults.llm_model
        );
        setModelValue(knownModel ? defaults.llm_model : "__custom__");
        setCustomModel(knownModel ? "" : defaults.llm_model);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Model Settings</DialogTitle>
          <DialogDescription>
            Choose your LLM provider and model. Changes apply to new messages.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="provider">Provider</Label>
            <Select value={providerValue} onValueChange={handleProviderChange}>
              <SelectTrigger id="provider">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isCustomProvider && (
              <Input
                placeholder="https://api.example.com/v1"
                value={customBaseUrl}
                onChange={(e) => setCustomBaseUrl(e.target.value)}
              />
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="model">Model</Label>
            {modelsForCurrentProvider.length > 0 ? (
              <Select value={modelValue} onValueChange={setModelValue}>
                <SelectTrigger id="model">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {modelsForCurrentProvider.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            {(modelValue === "__custom__" ||
              isCustomProvider ||
              modelsForCurrentProvider.length === 0) && (
              <Input
                placeholder={defaults?.llm_model || "model-name"}
                value={customModel}
                onChange={(e) => {
                  setCustomModel(e.target.value);
                  if (modelValue !== "__custom__") setModelValue("__custom__");
                }}
              />
            )}
          </div>
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

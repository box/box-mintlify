export const AIAgentConfig = () => {
  // Helper function to determine provider from model
  const getProviderFromModel = (model) => {
    if (model.startsWith("openai__") || model.startsWith("azure__openai")) return "openai";
    if (model.startsWith("google__")) return "google";
    if (model.startsWith("aws__")) return "aws";
    if (model.startsWith("ibm__") || model.startsWith("meta__")) return "ibm";
    if (model.startsWith("xai__")) return "openai"; // xAI uses similar params to OpenAI
    if (model.startsWith("azure__text")) return "openai"; // Azure embeddings
    return "openai"; // default
  };

  // Provider-specific parameter configurations
  const providerParams = {
    openai: {
      type: "openai_params",
      params: [
        { name: "temperature", label: "Temperature", min: 0, max: 2, step: 0.1, default: 0 },
        { name: "top_p", label: "Top P", min: 0.1, max: 1, step: 0.05, default: 0.9 },
        { name: "frequency_penalty", label: "Frequency Penalty", min: -2, max: 2, step: 0.1, default: 1.5 },
        { name: "presence_penalty", label: "Presence Penalty", min: -2, max: 2, step: 0.1, default: 1.5 },
        { name: "stop_sequence", label: "Stop Sequence", type: "text", default: "" },
      ],
    },
    google: {
      type: "google_params",
      params: [
        { name: "temperature", label: "Temperature", min: 0, max: 2, step: 0.1, default: 0 },
        { name: "top_p", label: "Top P", min: 0.1, max: 2, step: 0.1, default: 0.9 },
        { name: "top_k", label: "Top K", min: 0.1, max: 2, step: 0.1, default: 1 },
      ],
    },
    aws: {
      type: "aws_params",
      params: [
        { name: "temperature", label: "Temperature", min: 0, max: 1, step: 0.1, default: 0 },
        { name: "top_p", label: "Top P", min: 0, max: 1, step: 0.1, default: 0.9 },
      ],
    },
    ibm: {
      type: "ibm_params",
      params: [
        { name: "temperature", label: "Temperature", min: 0, max: 1, step: 0.1, default: 0 },
        { name: "top_p", label: "Top P", min: 0.1, max: 1, step: 0.1, default: 0.9 },
        { name: "top_k", label: "Top K", min: 1, max: 100, step: 1, default: 50 },
      ],
    },
  };

  // Helper to get default config for a provider
  const getDefaultParamsForProvider = (provider) => {
    const params = {};
    providerParams[provider].params.forEach((p) => {
      params[p.name] = p.default;
    });
    return params;
  };

  const allContentTypeIds = [
    "basic_text",
    "basic_text_multi",
    "basic_image",
    "basic_image_multi",
    "long_text",
    "long_text_multi",
    "spreadsheet",
  ];

  const [selectedAgentType, setSelectedAgentType] = useState("ai_agent_ask");
  const [selectedContentTypes, setSelectedContentTypes] = useState(["basic_text"]);
  const [activeTab, setActiveTab] = useState("basic_text");

  const defaultModel = "openai__o3";
  const defaultProvider = getProviderFromModel(defaultModel);

  const defaultConfig = {
    model: defaultModel,
    ...getDefaultParamsForProvider(defaultProvider),
    num_tokens_for_completion: 8400,
    prompt_template:
      "It is `{current_date}`, consider these travel options `{content}` and answer the `{user_question}`.",
    system_message: "You are a helpful travel assistant specialized in budget travel",
  };

  const [config, setConfig] = useState(() => {
    const initialConfig = {};
    allContentTypeIds.forEach((id) => {
      initialConfig[id] = { ...defaultConfig };
    });
    return initialConfig;
  });

  const agentTypes = [
    { value: "ai_agent_ask", label: "AI Ask" },
    { value: "ai_agent_text_gen", label: "AI Text gen" },
    { value: "ai_agent_extract", label: "AI extract free form" },
    { value: "ai_agent_extract_structured", label: "AI Extract structured" },
  ];

  const contentTypes = [
    { id: "basic_text", title: "Basic Text", description: "Simple text content" },
    { id: "basic_text_multi", title: "Basic Text Multi", description: "Multiple text files" },
    { id: "basic_image", title: "Basic Image", description: "Single image file" },
    { id: "basic_image_multi", title: "Basic Image Multi", description: "Multiple image files" },
    { id: "long_text", title: "Long Text", description: "Documents and PDFs" },
    { id: "long_text_multi", title: "Long Text Multi", description: "Multiple documents" },
    { id: "spreadsheet", title: "Spreadsheet", description: "Excel or CSV files" },
  ];

  const models = [
    { value: "openai__o3", label: "OpenAI GPT o3" },
    { value: "openai__o4_mini", label: "OpenAI GPT-4" },
    { value: "openai__gpt_4_1", label: "OpenAI GPT-4.1" },
    { value: "openai__gpt_4_1_mini", label: "OpenAI GPT-4.1 Mini" },
    { value: "openai__gpt_4o", label: "OpenAI GPT-4o" },
    { value: "openai__gpt_4o_mini", label: "OpenAI GPT-4o Mini" },
    { value: "azure__openai__gpt_4_1", label: "Azure OpenAI GPT-4.1" },
    { value: "azure__openai__gpt_4_1_mini", label: "Azure OpenAI GPT-4.1 Mini" },
    { value: "azure__openai__gpt_4o", label: "Azure OpenAI GPT-4o" },
    { value: "azure__openai__gpt_4o_mini", label: "Azure OpenAI GPT-4o Mini" },
    { value: "azure__text_embedding_ada_002", label: "Azure text-embedding-ada-002" },
    { value: "google__gemini_2_5_pro_preview", label: "Google Gemini 2.5 Pro Preview" },
    { value: "google__gemini_2_5_flash_preview", label: "Google Gemini 2.5 Flash Preview" },
    { value: "google__gemini_2_0_flash_lite_preview", label: "Google Gemini 2.0 Flash Lite" },
    { value: "google__gemini_2_0_flash_001", label: "Google Gemini 2.0 Flash" },
    { value: "google__gemini_1_5_pro_001", label: "Google Gemini 1.5 Pro 001" },
    { value: "google__gemini_1_5_flash", label: "Google Gemini 1.5 Flash" },
    { value: "google__gemini_pro", label: "Google Gemini Pro" },
    { value: "aws__claude_4_sonnet", label: "AWS Claude 4 Sonnet" },
    { value: "aws__claude_4_opus", label: "AWS Claude 4 Opus" },
    { value: "aws__claude_3_7_sonnet", label: "AWS Claude 3.7 Sonnet" },
    { value: "aws__claude_3_5_sonnet", label: "AWS Claude 3.5 Sonnet" },
    { value: "aws__claude_3_sonnet", label: "AWS Claude 3 Sonnet" },
    { value: "aws__claude_3_haiku", label: "AWS Claude 3 Haiku" },
    { value: "aws__titan_text_lite", label: "AWS Titan Text Lite" },
    { value: "ibm__llama_4_scout", label: "IBM Llama 4 Scout" },
    { value: "ibm__llama_3_2_90b_vision_instruct", label: "IBM Llama 3.2 Vision Instruct" },
    { value: "xai__grok_3_beta", label: "xAI Grok 3 Beta" },
    { value: "xai__grok_3_mini_reasoning_beta", label: "xAI Grok 3 Mini Reasoning Beta" },
    { value: "meta__llama_70b", label: "Meta LLaMA 70B" },
  ];

  const toggleContentType = (id) => {
    if (selectedContentTypes.includes(id)) {
      if (selectedContentTypes.length > 1) {
        const newSelected = selectedContentTypes.filter((t) => t !== id);
        setSelectedContentTypes(newSelected);
        if (activeTab === id) {
          setActiveTab(newSelected[0]);
        }
      }
    } else {
      setSelectedContentTypes((prev) => [...prev, id]);
      if (!config[id]) {
        setConfig((prev) => ({
          ...prev,
          [id]: { ...defaultConfig },
        }));
      }
    }
  };

  const updateConfig = (contentType, field, value) => {
    setConfig((prev) => ({
      ...prev,
      [contentType]: {
        ...prev[contentType],
        [field]: value,
      },
    }));
  };

  // Handle model change - reset params when provider changes
  const handleModelChange = (contentType, newModel) => {
    const newProvider = getProviderFromModel(newModel);
    const oldProvider = getProviderFromModel(config[contentType].model);

    if (newProvider !== oldProvider) {
      // Reset params to defaults of new provider
      const newParams = {
        model: newModel,
        ...getDefaultParamsForProvider(newProvider),
      };
      setConfig((prev) => ({
        ...prev,
        [contentType]: {
          ...prev[contentType],
          ...newParams,
        },
      }));
    } else {
      updateConfig(contentType, "model", newModel);
    }
  };

  const generateJSON = () => {
    const output = { type: selectedAgentType };
    selectedContentTypes.forEach((ct) => {
      if (config[ct]) {
        const provider = getProviderFromModel(config[ct].model);
        const paramsConfig = providerParams[provider];

        // Build llm_endpoint_params dynamically based on provider
        const llmParams = { type: paramsConfig.type };
        paramsConfig.params.forEach((p) => {
          // Only include text params if they have a value
          if (p.type === "text") {
            if (config[ct][p.name]) {
              llmParams[p.name === "stop_sequence" ? "stop" : p.name] = config[ct][p.name];
            }
          } else {
            llmParams[p.name] = config[ct][p.name];
          }
        });

        const baseConfig = {
          llm_endpoint_params: llmParams,
          model: config[ct].model,
          num_tokens_for_completion: config[ct].num_tokens_for_completion,
          prompt_template: config[ct].prompt_template,
          system_message: config[ct].system_message,
        };

        // Add embeddings for long_text and long_text_multi
        if (ct === "long_text" || ct === "long_text_multi") {
          baseConfig.embeddings = {
            model: "azure__openai__text_embedding_ada_002",
            strategy: {
              id: "basic",
              num_tokens_per_chunk: 64,
            },
          };
        }

        output[ct] = baseConfig;
      }
    });
    return JSON.stringify(output, null, 2);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateJSON());
  };

  const downloadJSON = () => {
    const blob = new Blob([generateJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ai-agent-config.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="max-w-[1400px] mx-auto w-full">
      <div className="grid grid-cols-1 min-[900px]:grid-cols-2 gap-8 w-full">
        {/* Left Column - Configuration */}
        <aside className="space-y-6">
          <div>
            <h2 className="text-[28px] font-bold text-gray-900 dark:text-white mb-2">Agent configuration</h2>
            <hr className="border-t border-dashed border-gray-300 dark:border-gray-600 my-3 mb-1" />
            <p className="text-gray-600 dark:text-gray-400">
              Configure your AI agent's settings and LLM fine-tune parameters.
            </p>
          </div>

          {/* Step 1: Agent Type */}
          <div className="space-y-3 border border-1 dark:border-gray-700 rounded-xl p-5">
            <p className=" text-gray-900 dark:text-white text-[19px] font-medium">1. Choose agent type</p>
            <select
              value={selectedAgentType}
              onChange={(e) => setSelectedAgentType(e.target.value)}
              className="w-full p-3 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer relative z-10"
              style={{
                appearance: "none",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
                backgroundSize: "10px 10px",
              }}
            >
              {agentTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Content Types */}
          <div className="space-y-3 border border-1 dark:border-gray-700 rounded-xl p-5">
            <p className=" text-gray-900 dark:text-white text-[19px] font-medium">2. Add content types</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {contentTypes.map((ct) => (
                <button
                  key={ct.id}
                  onClick={() => toggleContentType(ct.id)}
                  className={`p-3 rounded-lg text-left transition-all border ${
                    selectedContentTypes.includes(ct.id)
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                  }`}
                >
                  <h4 className="font-medium text-sm text-gray-900 dark:text-white">{ct.title}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{ct.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Configure Content Type */}
          <div className="space-y-3 border border-1 dark:border-gray-700 rounded-xl p-5">
            <p className=" text-gray-900 dark:text-white text-[19px] font-medium">
              3. Configure each content type object
            </p>

            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700">
              {selectedContentTypes.map((ct) => (
                <button
                  key={ct}
                  onClick={() => setActiveTab(ct)}
                  className={`px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === ct
                      ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 bg-gray-50 dark:bg-gray-800"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {contentTypes.find((c) => c.id === ct)?.title || ct}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {config[activeTab] && (
              <div className="space-y-6 pt-4">
                {/* Model Selection */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">3.1 Choose LLM model</h4>
                  <select
                    value={config[activeTab].model}
                    onChange={(e) => handleModelChange(activeTab, e.target.value)}
                    className="w-full p-3 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer relative z-10"
                    style={{
                      appearance: "none",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 12px center",
                      backgroundSize: "10px 10px",
                    }}
                  >
                    {models.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* LLM Parameters - Dynamic based on provider */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">3.2 Fine-tune LLM parameters</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Dynamic provider-specific params */}
                    {providerParams[getProviderFromModel(config[activeTab].model)].params.map((param) => (
                      <div key={param.name}>
                        {param.type === "text" ? (
                          <>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{param.label}</label>
                            <input
                              type="text"
                              value={config[activeTab][param.name] || ""}
                              onChange={(e) => updateConfig(activeTab, param.name, e.target.value)}
                              placeholder={`Enter ${param.label.toLowerCase()}`}
                              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                            />
                          </>
                        ) : (
                          <>
                            <label className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                              <span>{param.label}</span>
                              <span>{config[activeTab][param.name] ?? param.default}</span>
                            </label>
                            <input
                              type="range"
                              min={param.min}
                              max={param.max}
                              step={param.step}
                              value={config[activeTab][param.name] ?? param.default}
                              onChange={(e) => updateConfig(activeTab, param.name, parseFloat(e.target.value))}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                              <span>{param.min}</span>
                              <span>{param.max}</span>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    {/* Max Tokens - always shown */}
                    <div>
                      <label className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <span>Max Tokens</span>
                        <span>{config[activeTab].num_tokens_for_completion}</span>
                      </label>
                      <input
                        type="range"
                        min="100"
                        max="10000"
                        step="100"
                        value={config[activeTab].num_tokens_for_completion}
                        onChange={(e) => updateConfig(activeTab, "num_tokens_for_completion", parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>100</span>
                        <span>10000</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Prompts */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">3.3 Customize prompts and messages</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Prompt Template</label>
                      <textarea
                        value={config[activeTab].prompt_template}
                        onChange={(e) => updateConfig(activeTab, "prompt_template", e.target.value)}
                        placeholder="Enter prompt template"
                        rows={4}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">System Message</label>
                      <textarea
                        value={config[activeTab].system_message}
                        onChange={(e) => updateConfig(activeTab, "system_message", e.target.value)}
                        placeholder="Enter system message"
                        rows={3}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right Column - JSON Output */}
        <nav className="border border-1 dark:border-gray-700 rounded-xl p-5 space-y-4 sticky top-[200px] self-start">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <h3 className="font-semibold text-[19px] text-gray-900 dark:text-white whitespace-nowrap">
              Generated configuration
            </h3>
            <div className="flex gap-2">
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-700 text-white rounded-lg hover:bg-blue-600 transition-all duration-300 ease-in-out"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                コピー
              </button>
              <button
                onClick={downloadJSON}
                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-all duration-300 ease-in-out"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download configuration
              </button>
            </div>
          </div>

          <CodeBlock language="json" wrap className="h-[700px] ai_agent_code">
            {generateJSON()}
          </CodeBlock>
        </nav>
      </div>
    </section>
  );
};

export const HeroSection = ({ title, description }) => {
  return (
    <section className="grid grid-cols-1 min-[900px]:grid-cols-2 gap-12 items-center max-w-[1400px] mx-auto text-center min-[900px]:text-left max-[900px]:mt-5">
      <div className="space-y-6">
        <div
          role="heading"
          aria-level="1"
          className="text-[40px] min-[900px]:text-[60px] font-bold text-gray-900 dark:text-white leading-tight"
        >
          {title}
        </div>
        <p className="text-xl text-gray-600 dark:text-gray-300 font-normal tracking-[0.3px] leading-[40px] max-w-none text-center min-[900px]:text-left">
          {description}
        </p>
      </div>
      <div className="relative flex justify-center min-[900px]:justify-end">
        <img
          src="/static/agent-configurator/hero.png"
          alt="Box AI API Agent Configuration Tool"
          className="w-full max-w-[585px] h-auto object-contain"
        />
      </div>
    </section>
  );
};

export const FeatureTilesJA = () => {
  const features = [
    {
      icon: (
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="56" height="56" rx="12" fill="#E5EFFA" />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M20.2265 35.2835c-.2055.0005-.4089-.0402-.5983-.1199-.1894-.0797-.3609-.1966-.5042-.3438l-4.6637-4.7968c-.2961-.3038-.4613-.7116-.4603-1.1357 0-.427.1663-.8348.4603-1.1358l4.6637-4.7967c.145-.1465.318-.2622.5088-.3402.1907-.0779.3952-.1166.6013-.1137.206.003.4094.0475.5978.1309.1884.0834.3581.2039.4989.3545.2894.3092.4478.7185.442 1.142-.0059.4236-.1756.8284-.4735 1.1295l-3.5438 3.6295 3.5438 3.6295c.296.3038.4612.7115.4602 1.1357.001.4242-.1642.8319-.4602 1.1358-.1373.1492-.3028.2698-.4869.3548-.1841.085-.3833.1327-.5859.1404Zm15.547 0c.2055.0005.409-.0402.5983-.1199.1894-.0797.3609-.1966.5042-.3438l4.6638-4.7968c.296-.3038.4612-.7116.4602-1.1357.001-.4242-.1642-.832-.4602-1.1358l-4.6638-4.7967c-.1427-.1487-.3141-.267-.5037-.3479-.1896-.0808-.3936-.1224-.5997-.1224s-.4101.0416-.5997.1224c-.1896.0809-.3609.1992-.5036.3479-.2932.305-.4569.7117-.4569 1.1348 0 .4231.1637.8298.4569 1.1349l3.528 3.6628-3.528 3.6295c-.2961.3038-.4613.7115-.4603 1.1357 0 .427.1663.8348.4603 1.1358.2887.3115.686.49 1.1025.4952h.0017Zm-10.1045 3.199c-.1337.0242-.2706.0242-.4042 0-.4182-.1545-.7626-.4611-.9644-.8586-.2018-.3974-.2461-.8564-.1241-1.2851L28.84 20.636c.028-.2191.1009-.4301.2141-.6198.1132-.1897.2643-.354.4439-.4827.1769-.1265.3789-.2135.5924-.2552.2134-.0416.4334-.037.6449.0137.8575.3045 1.337 1.246 1.0885 2.1438L27.16 37.1385c-.0524.3629-.2303.696-.5026.9415-.2723.2455-.622.3879-.9884.4025Z"
            fill="#0061D5"
          />
        </svg>
      ),
      title: "視覚的な構成",
      description: "フォームベースの直感的なインターフェースを使用した、AIの複雑な構成が可能です。",
    },
    {
      icon: <img src="/static/ai-dev-zone/icon-ai.svg" alt="" className="w-14 h-14" />,
      title: "リアルタイムのプレビュー",
      description: "変更に合わせて、リアルタイムでJSON構成の更新を確認できます。",
    },
    {
      icon: (
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="56" height="56" rx="12" fill="#ECE9F8" />
          <path
            d="M18 27.9131V34.6212C18 36.6794 19.6685 38.3479 21.7267 38.3479H34.2733C36.3315 38.3479 38 36.6794 38 34.6212V27.9131"
            stroke="#3A1E9B"
            strokeWidth="2.17391"
            strokeLinecap="round"
          />
          <path
            d="M29.202 13.2326C28.7782 12.8088 28.091 12.8088 27.6672 13.2326L20.7605 20.1393C20.3366 20.5631 20.3366 21.2503 20.7605 21.6741C21.1843 22.0979 21.8715 22.0979 22.2953 21.6741L28.4346 15.5348L34.5739 21.6741C34.9977 22.0979 35.6849 22.0979 36.1087 21.6741C36.5325 21.2503 36.5325 20.5631 36.1087 20.1393L29.202 13.2326ZM27.3493 29.6522C27.3493 30.2516 27.8352 30.7375 28.4346 30.7375C29.034 30.7375 29.5199 30.2516 29.5199 29.6522H27.3493ZM28.4346 14H27.3493V29.6522H28.4346H29.5199V14H28.4346Z"
            fill="#3A1E9B"
          />
        </svg>
      ),
      title: "エクスポートと共有",
      description: "構成をコピーし、プロジェクトに直接貼り付けることができます。",
    },
  ];

  return (
    <section className="max-w-[1400px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <div
            key={index}
            className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300 ease-in-out"
          >
            <div className="mb-2">{feature.icon}</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
            <span className="block text-[#6f6f6f] dark:text-gray-400 text-[13px] font-normal tracking-[0.3px] leading-[18px]">
              {feature.description}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export const FeatureTilesEN = () => {
  const features = [
    {
      icon: (
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="56" height="56" rx="12" fill="#E5EFFA" />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M20.2265 35.2835c-.2055.0005-.4089-.0402-.5983-.1199-.1894-.0797-.3609-.1966-.5042-.3438l-4.6637-4.7968c-.2961-.3038-.4613-.7116-.4603-1.1357 0-.427.1663-.8348.4603-1.1358l4.6637-4.7967c.145-.1465.318-.2622.5088-.3402.1907-.0779.3952-.1166.6013-.1137.206.003.4094.0475.5978.1309.1884.0834.3581.2039.4989.3545.2894.3092.4478.7185.442 1.142-.0059.4236-.1756.8284-.4735 1.1295l-3.5438 3.6295 3.5438 3.6295c.296.3038.4612.7115.4602 1.1357.001.4242-.1642.8319-.4602 1.1358-.1373.1492-.3028.2698-.4869.3548-.1841.085-.3833.1327-.5859.1404Zm15.547 0c.2055.0005.409-.0402.5983-.1199.1894-.0797.3609-.1966.5042-.3438l4.6638-4.7968c.296-.3038.4612-.7116.4602-1.1357.001-.4242-.1642-.832-.4602-1.1358l-4.6638-4.7967c-.1427-.1487-.3141-.267-.5037-.3479-.1896-.0808-.3936-.1224-.5997-.1224s-.4101.0416-.5997.1224c-.1896.0809-.3609.1992-.5036.3479-.2932.305-.4569.7117-.4569 1.1348 0 .4231.1637.8298.4569 1.1349l3.528 3.6628-3.528 3.6295c-.2961.3038-.4613.7115-.4603 1.1357 0 .427.1663.8348.4603 1.1358.2887.3115.686.49 1.1025.4952h.0017Zm-10.1045 3.199c-.1337.0242-.2706.0242-.4042 0-.4182-.1545-.7626-.4611-.9644-.8586-.2018-.3974-.2461-.8564-.1241-1.2851L28.84 20.636c.028-.2191.1009-.4301.2141-.6198.1132-.1897.2643-.354.4439-.4827.1769-.1265.3789-.2135.5924-.2552.2134-.0416.4334-.037.6449.0137.8575.3045 1.337 1.246 1.0885 2.1438L27.16 37.1385c-.0524.3629-.2303.696-.5026.9415-.2723.2455-.622.3879-.9884.4025Z"
            fill="#0061D5"
          />
        </svg>
      ),
      title: "Visual Configuration",
      description: "Configure complex AI settings using an intuitive, form-based interface.",
    },
    {
      icon: <img src="/static/ai-dev-zone/icon-ai.svg" alt="" className="w-14 h-14" />,
      title: "Real-Time Preview",
      description: "See real-time updates to the JSON configuration as you make changes.",
    },
    {
      icon: (
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="56" height="56" rx="12" fill="#ECE9F8" />
          <path
            d="M18 27.9131V34.6212C18 36.6794 19.6685 38.3479 21.7267 38.3479H34.2733C36.3315 38.3479 38 36.6794 38 34.6212V27.9131"
            stroke="#3A1E9B"
            strokeWidth="2.17391"
            strokeLinecap="round"
          />
          <path
            d="M29.202 13.2326C28.7782 12.8088 28.091 12.8088 27.6672 13.2326L20.7605 20.1393C20.3366 20.5631 20.3366 21.2503 20.7605 21.6741C21.1843 22.0979 21.8715 22.0979 22.2953 21.6741L28.4346 15.5348L34.5739 21.6741C34.9977 22.0979 35.6849 22.0979 36.1087 21.6741C36.5325 21.2503 36.5325 20.5631 36.1087 20.1393L29.202 13.2326ZM27.3493 29.6522C27.3493 30.2516 27.8352 30.7375 28.4346 30.7375C29.034 30.7375 29.5199 30.2516 29.5199 29.6522H27.3493ZM28.4346 14H27.3493V29.6522H28.4346H29.5199V14H28.4346Z"
            fill="#3A1E9B"
          />
        </svg>
      ),
      title: "Export and Share",
      description: "Copy the configuration and paste it directly into your project.",
    },
  ];

  return (
    <section className="max-w-[1400px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <div
            key={index}
            className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300 ease-in-out"
          >
            <div className="mb-2">{feature.icon}</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
            <span className="block text-[#6f6f6f] dark:text-gray-400 text-[13px] font-normal tracking-[0.3px] leading-[18px]">
              {feature.description}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

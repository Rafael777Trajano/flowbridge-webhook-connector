import { useState } from 'react';
import {
  Webhook,
  Zap,
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Terminal,
  ArrowRight,
  Layers,
  Cpu,
  History,
  Sparkles,
  Code2,
  KeyRound
} from 'lucide-react';
import {
  EVENT_TEMPLATES,
  dispatchWebhookEvent,
  type TargetPlatform,
  type WebhookDeliveryLog
} from './services/webhookEngine';

const PLATFORMS: { id: TargetPlatform; name: string; tag: string; color: string }[] = [
  { id: 'n8n', name: 'n8n Workflow', tag: 'Self-Hosted / Cloud', color: 'text-orange-400 border-orange-500/40 bg-orange-500/10' },
  { id: 'make', name: 'Make (Integromat)', tag: 'Scenario Hook', color: 'text-fuchsia-400 border-fuchsia-500/40 bg-fuchsia-500/10' },
  { id: 'zapier', name: 'Zapier Catch Hook', tag: 'Instant Trigger', color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
  { id: 'slack', name: 'Slack / Teams API', tag: 'Incoming Alert', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' }
];

export function App() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(EVENT_TEMPLATES[0].id);
  const [rawJsonText, setRawJsonText] = useState<string>(
    JSON.stringify(EVENT_TEMPLATES[0].rawPayload, null, 2)
  );
  const [targetPlatform, setTargetPlatform] = useState<TargetPlatform>('n8n');
  const [endpointUrl, setEndpointUrl] = useState<string>('');
  const [authToken, setAuthToken] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [logs, setLogs] = useState<WebhookDeliveryLog[]>([]);
  const [activeLog, setActiveLog] = useState<WebhookDeliveryLog | null>(null);
  const [inspectorMode, setInspectorMode] = useState<'payload' | 'curl'>('payload');
  const [copied, setCopied] = useState<boolean>(false);

  const currentTemplate =
    EVENT_TEMPLATES.find(t => t.id === selectedTemplateId) || EVENT_TEMPLATES[0];

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const found = EVENT_TEMPLATES.find(t => t.id === id);
    if (found) {
      setRawJsonText(JSON.stringify(found.rawPayload, null, 2));
    }
  };

  const handleTriggerWebhook = async () => {
    if (!rawJsonText.trim() || isSending) return;
    setIsSending(true);

    const delivery = await dispatchWebhookEvent({
      eventName: currentTemplate.name,
      sourceSystem: currentTemplate.sourceSystem,
      rawJsonText,
      targetPlatform,
      endpointUrl,
      authToken
    });

    setLogs(prev => [delivery, ...prev]);
    setActiveLog(delivery);
    setIsSending(false);
  };

  const handleCopyInspector = () => {
    if (!activeLog) return;
    const text =
      inspectorMode === 'payload'
        ? JSON.stringify(activeLog.enrichedPayload, null, 2)
        : activeLog.curlCommand;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-200">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-[#0a0f1d]/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Webhook className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-100 tracking-tight text-base sm:text-lg">
                  FlowBridge <span className="text-emerald-400">AI</span>
                </h1>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  Zero-Backend Webhook Connector
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Orquestração de Eventos, Enriquecimento IA & Roteamento HTTP para n8n / Make / Zapier
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            AI Builder: <strong className="text-slate-200">Rafael Trajano</strong>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Visual Pipeline Architecture Banner */}
        <section className="bg-[#0b1120] border border-slate-800/90 rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 font-mono text-slate-300">
                1. Trigger ({currentTemplate.sourceSystem})
              </span>
              <ArrowRight className="w-4 h-4 text-slate-600" />
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-medium flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                2. AI Enrichment & SLA Router
              </span>
              <ArrowRight className="w-4 h-4 text-slate-600" />
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono">
                3. HTTP POST → {targetPlatform.toUpperCase()}
              </span>
            </div>

            <span className="text-[11px] text-slate-400">
              {endpointUrl.trim() ? '🟢 Modo Live Webhook Ativo' : '🟡 Modo Sandbox (Sem URL externa)'}
            </span>
          </div>
        </section>

        {/* Main Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Panel: Event Composer & Destination Config (6 cols) */}
          <div className="lg:col-span-6 bg-[#0b1120] border border-slate-800/90 rounded-2xl p-5 space-y-5">
            {/* Step 1: Select Event Template */}
            <div className="space-y-2.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                1. Gatilho Operacional (Event Source)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EVENT_TEMPLATES.map(tpl => {
                  const active = tpl.id === selectedTemplateId;
                  return (
                    <button
                      key={tpl.id}
                      onClick={() => handleSelectTemplate(tpl.id)}
                      className={`text-left p-3 rounded-xl border transition cursor-pointer ${
                        active
                          ? 'bg-emerald-500/10 border-emerald-500/50 text-slate-100'
                          : 'bg-[#060913] border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-[10px] font-mono text-emerald-400 mb-0.5">{tpl.badge}</div>
                      <div className="text-xs font-semibold truncate">{tpl.name}</div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400">{currentTemplate.description}</p>
            </div>

            {/* Step 2: Raw JSON Event Payload */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                  2. Payload Bruto do Evento (Editável)
                </label>
                <span className="text-[11px] font-mono text-slate-500">application/json</span>
              </div>
              <textarea
                value={rawJsonText}
                onChange={e => setRawJsonText(e.target.value)}
                rows={7}
                className="w-full bg-[#060913] border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-cyan-100/90 focus:outline-none focus:border-emerald-500/60 leading-relaxed"
              />
            </div>

            {/* Step 3: Target Platform & Endpoint */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                3. Destino da Integração (Zero-Backend)
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PLATFORMS.map(plat => {
                  const selected = targetPlatform === plat.id;
                  return (
                    <button
                      key={plat.id}
                      onClick={() => setTargetPlatform(plat.id)}
                      className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                        selected
                          ? plat.color
                          : 'bg-[#060913] border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-bold">{plat.name.split(' ')[0]}</div>
                      <div className="text-[10px] opacity-80 truncate">{plat.tag}</div>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="url"
                  value={endpointUrl}
                  onChange={e => setEndpointUrl(e.target.value)}
                  placeholder="https://hook.us1.make.com/... (Opcional)"
                  className="sm:col-span-2 bg-[#060913] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/60"
                />
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={authToken}
                    onChange={e => setAuthToken(e.target.value)}
                    placeholder="Bearer Token"
                    className="w-full bg-[#060913] border border-slate-800 rounded-xl pl-8 pr-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/60"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleTriggerWebhook}
              disabled={isSending || !rawJsonText.trim()}
              className="w-full py-3 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15 transition cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {isSending ? 'Enriquecendo & Disparando Webhook...' : 'Disparar Evento & Rotear Payload'}
            </button>
          </div>

          {/* Right Panel: Inspector & Live Audit Stream (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            {/* Payload & cURL Inspector */}
            <div className="bg-[#0b1120] border border-slate-800/90 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-semibold text-slate-100">
                    Inspetor de Saída Enriquecida
                  </h2>
                </div>

                {activeLog && (
                  <div className="flex items-center gap-2">
                    <div className="flex bg-[#060913] p-1 rounded-lg border border-slate-800 text-xs">
                      <button
                        onClick={() => setInspectorMode('payload')}
                        className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                          inspectorMode === 'payload'
                            ? 'bg-emerald-500/20 text-emerald-300 font-medium'
                            : 'text-slate-400'
                        }`}
                      >
                        JSON Enriquecido
                      </button>
                      <button
                        onClick={() => setInspectorMode('curl')}
                        className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                          inspectorMode === 'curl'
                            ? 'bg-emerald-500/20 text-emerald-300 font-medium'
                            : 'text-slate-400'
                        }`}
                      >
                        cURL Terminal
                      </button>
                    </div>

                    <button
                      onClick={handleCopyInspector}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-emerald-400" />
                          Copiar
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {!activeLog ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-sm font-medium text-slate-300">
                    Nenhum webhook disparado nesta sessão
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Clique em <strong>Disparar Evento & Rotear Payload</strong> para visualizar o JSON enriquecido com SLA/prioridade e o comando cURL equivalente.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-[#060913] p-3 rounded-xl border border-slate-800">
                    <span className="font-mono text-emerald-400 font-semibold">
                      {activeLog.deliveryId}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
                      {activeLog.statusLabel}
                    </span>
                    <span className="font-mono text-slate-400">{activeLog.latencyMs}ms</span>
                  </div>

                  <pre className="bg-[#060913] border border-slate-800 rounded-xl p-4 text-xs font-mono text-emerald-300/90 max-h-[290px] overflow-auto">
                    {inspectorMode === 'payload'
                      ? JSON.stringify(activeLog.enrichedPayload, null, 2)
                      : activeLog.curlCommand}
                  </pre>
                </div>
              )}
            </div>

            {/* Delivery Audit History */}
            <div className="bg-[#0b1120] border border-slate-800/90 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-indigo-400" />
                  Histórico de Disparos em Tempo Real ({logs.length})
                </h3>
              </div>

              {logs.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">
                  Os registros de entrega HTTP aparecerão aqui automaticamente.
                </p>
              ) : (
                <div className="space-y-2 max-h-[210px] overflow-y-auto pr-1">
                  {logs.map(item => (
                    <button
                      key={item.deliveryId}
                      onClick={() => setActiveLog(item)}
                      className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                        activeLog?.deliveryId === item.deliveryId
                          ? 'bg-slate-900 border-emerald-500/40'
                          : 'bg-[#060913] border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.statusCode < 400 ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <div className="truncate">
                          <div className="text-xs font-semibold text-slate-200 truncate">
                            {item.eventName}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 truncate">
                            {item.targetPlatform.toUpperCase()} • {item.timestamp}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-mono text-emerald-400 block">
                          HTTP {item.statusCode}
                        </span>
                        <span className="text-[10px] text-slate-500">{item.latencyMs}ms</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
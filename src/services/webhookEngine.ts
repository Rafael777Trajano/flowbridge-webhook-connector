export type TargetPlatform = 'n8n' | 'make' | 'zapier' | 'slack';

export interface EventTemplate {
  id: string;
  name: string;
  badge: string;
  sourceSystem: string;
  description: string;
  rawPayload: Record<string, unknown>;
}

export interface EnrichedWebhookPayload {
  event_meta: {
    delivery_id: string;
    timestamp_iso: string;
    source_system: string;
    target_platform: TargetPlatform;
    router_engine: string;
  };
  ai_routing_decision: {
    priority: 'P1_CRÍTICA' | 'P2_ALTA' | 'P3_NORMAL';
    sla_minutes: number;
    target_channel: string;
    automated_action: string;
    sanitized: boolean;
  };
  data: Record<string, unknown>;
}

export interface WebhookDeliveryLog {
  deliveryId: string;
  timestamp: string;
  eventName: string;
  targetPlatform: TargetPlatform;
  endpointUrl: string;
  statusCode: number;
  statusLabel: string;
  latencyMs: number;
  enrichedPayload: EnrichedWebhookPayload;
  curlCommand: string;
}

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: 'access-alert',
    name: 'Controle de Acesso · Alerta Operacional',
    badge: 'Operações / Segurança',
    sourceSystem: 'Portaria-Control-API',
    description: 'Dispara quando há tentativa de acesso fora de horário ou veículo não cadastrado.',
    rawPayload: {
      event_type: 'unauthorized_gate_attempt',
      unit: 'Torre B - Acesso Garagem 02',
      plate: 'BRA-9E42',
      operator: 'plantao_noturno',
      risk_flag: true,
      notes: 'Prestador sem agendamento prévio no sistema.'
    }
  },
  {
    id: 'delivery-sla',
    name: 'Delivery & CX · Risco de Atraso SLA',
    badge: 'Logística / iFood Flow',
    sourceSystem: 'Order-Dispatch-Stream',
    description: 'Detecta pedido acima do tempo estimado e aciona roteamento automático de suporte.',
    rawPayload: {
      event_type: 'order_sla_breach_risk',
      order_id: 'ORD-774910',
      delay_minutes: 28,
      order_value_brl: 94.5,
      customer_tier: 'Club_VIP',
      region: 'São Paulo - Zona Leste'
    }
  },
  {
    id: 'network-down',
    name: 'Infraestrutura · Queda de Link / SNMP',
    badge: 'Redes / NOC',
    sourceSystem: 'Zabbix-NetMonitor',
    description: 'Integra alertas críticos de roteador/switch diretamente para canais de resposta.',
    rawPayload: {
      event_type: 'interface_link_down',
      device: 'RTR-BORDA-SP01',
      interface: 'GigabitEthernet0/0/1',
      ip_address: '10.254.1.1',
      packet_loss_pct: 100,
      critical_service: true
    }
  },
  {
    id: 'lead-triage',
    name: 'Consultoria TI · Novo Diagnóstico Solicitado',
    badge: 'CRM / Comercial',
    sourceSystem: 'LandingPage-Webhook',
    description: 'Captura solicitação de consultoria, classifica porte e cria card no CRM/Planilha.',
    rawPayload: {
      event_type: 'new_consulting_lead',
      company: 'Clínica Vida & Saúde Ltda',
      contact_email: 'ti@clinicavida.com.br',
      employees: 45,
      need: 'Automação de atendimento WhatsApp + Backup em nuvem',
      urgency: 'alta'
    }
  }
];

function computeAiRouting(
  data: Record<string, unknown>,
  platform: TargetPlatform
): EnrichedWebhookPayload['ai_routing_decision'] {
  const serialized = JSON.stringify(data).toLowerCase();

  const isCritical =
    serialized.includes('true') ||
    serialized.includes('down') ||
    serialized.includes('unauthorized') ||
    serialized.includes('100');

  const isHigh =
    isCritical ||
    serialized.includes('alta') ||
    serialized.includes('breach') ||
    serialized.includes('vip');

  if (isCritical) {
    return {
      priority: 'P1_CRÍTICA',
      sla_minutes: 5,
      target_channel: `#alertas-criticos-${platform}`,
      automated_action: 'Notificar plantão imediato + abrir incidente automático com escalonamento',
      sanitized: true
    };
  }

  if (isHigh) {
    return {
      priority: 'P2_ALTA',
      sla_minutes: 15,
      target_channel: `#operacoes-prioritarias-${platform}`,
      automated_action: 'Enfileirar atendimento prioritário e registrar log na planilha mestre',
      sanitized: true
    };
  }

  return {
    priority: 'P3_NORMAL',
    sla_minutes: 60,
    target_channel: `#fluxo-geral-${platform}`,
    automated_action: 'Registrar evento no CRM/Sheets e enviar confirmação assíncrona',
    sanitized: true
  };
}

export function buildCurlCommand(
  url: string,
  authHeader: string,
  payload: EnrichedWebhookPayload
): string {
  const target = url.trim() || 'https://hook.us1.make.com/seu-webhook-id';
  const authLine = authHeader.trim()
    ? ` \\\n  -H "Authorization: Bearer ${authHeader.trim()}"`
    : '';

  return `curl -X POST "${target}" \\
  -H "Content-Type: application/json"${authLine} \\
  -d '${JSON.stringify(payload, null, 2)}'`;
}

export async function dispatchWebhookEvent(params: {
  eventName: string;
  sourceSystem: string;
  rawJsonText: string;
  targetPlatform: TargetPlatform;
  endpointUrl: string;
  authToken: string;
}): Promise<WebhookDeliveryLog> {
  const start = performance.now();
  const deliveryId = `WHK-${Math.floor(100000 + Math.random() * 900000)}`;

  let parsedData: Record<string, unknown>;
  try {
    parsedData = JSON.parse(params.rawJsonText);
  } catch {
    parsedData = { raw_message: params.rawJsonText };
  }

  const enrichedPayload: EnrichedWebhookPayload = {
    event_meta: {
      delivery_id: deliveryId,
      timestamp_iso: new Date().toISOString(),
      source_system: params.sourceSystem,
      target_platform: params.targetPlatform,
      router_engine: 'FlowBridge-AI-ZeroBackend v1.2'
    },
    ai_routing_decision: computeAiRouting(parsedData, params.targetPlatform),
    data: parsedData
  };

  const cleanUrl = params.endpointUrl.trim();
  const curlCommand = buildCurlCommand(cleanUrl, params.authToken, enrichedPayload);

  let statusCode = 200;
  let statusLabel = '200 OK · Sandbox Simulado';

  if (cleanUrl) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (params.authToken.trim()) {
        headers['Authorization'] = `Bearer ${params.authToken.trim()}`;
      }

      const response = await fetch(cleanUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(enrichedPayload)
      });

      statusCode = response.status || 200;
      statusLabel = `${statusCode} ${response.statusText || 'OK'} · Live HTTP`;
    } catch {
      // Fallback no-cors para garantir entrega em webhooks externos (Make/n8n/Zapier) sem cabeçalho CORS
      try {
        await fetch(cleanUrl, {
          method: 'POST',
          mode: 'no-cors',
          body: JSON.stringify(enrichedPayload)
        });
        statusCode = 202;
        statusLabel = '202 Dispatched · Live Webhook (Opaque)';
      } catch {
        statusCode = 502;
        statusLabel = '502 Bad Gateway · URL Inacessível';
      }
    }
  } else {
    await new Promise(r => setTimeout(r, 480));
  }

  const latencyMs = Math.max(12, Math.round(performance.now() - start));

  return {
    deliveryId,
    timestamp: new Date().toLocaleTimeString('pt-BR'),
    eventName: params.eventName,
    targetPlatform: params.targetPlatform,
    endpointUrl: cleanUrl || `sandbox://${params.targetPlatform}.local/webhook`,
    statusCode,
    statusLabel,
    latencyMs,
    enrichedPayload,
    curlCommand
  };
}
/**
 * WhatsApp Integration — Adaptado de Forja
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * Evolution API client for WhatsApp Business
 */

const EVOLUTION_API_URL = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || '';
const EVOLUTION_API_KEY = process.env.NEXT_PUBLIC_EVOLUTION_API_KEY || '';

export interface WhatsAppMessage {
  number: string;
  text: string;
  options?: {
    delay?: number;
    quoted?: string;
  };
}

export interface WhatsAppButton {
  number: string;
  title: string;
  description: string;
  buttons: Array<{
    id: string;
    text: string;
  }>;
}

export interface WhatsAppList {
  number: string;
  title: string;
  description: string;
  buttonText: string;
  sections: Array<{
    title: string;
    rows: Array<{
      id: string;
      title: string;
      description?: string;
    }>;
  }>;
}

// Format phone number to Brazilian format
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 || cleaned.length === 10) {
    return `55${cleaned}`;
  }
  if (cleaned.startsWith('55')) {
    return cleaned;
  }
  return `55${cleaned}`;
}

// Send text message
export async function sendTextMessage(message: WhatsAppMessage): Promise<boolean> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.warn('WhatsApp not configured');
    return false;
  }

  try {
    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: formatPhoneNumber(message.number),
        text: message.text,
        options: message.options || {},
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error);
    return false;
  }
}

// Send buttons message
export async function sendButtonMessage(button: WhatsAppButton): Promise<boolean> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.warn('WhatsApp not configured');
    return false;
  }

  try {
    const response = await fetch(`${EVOLUTION_API_URL}/message/sendButtons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: formatPhoneNumber(button.number),
        title: button.title,
        description: button.description,
        buttons: button.buttons,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send WhatsApp buttons:', error);
    return false;
  }
}

// Send list message
export async function sendListMessage(list: WhatsAppList): Promise<boolean> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.warn('WhatsApp not configured');
    return false;
  }

  try {
    const response = await fetch(`${EVOLUTION_API_URL}/message/sendList`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: formatPhoneNumber(list.number),
        title: list.title,
        description: list.description,
        buttonText: list.buttonText,
        sections: list.sections,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send WhatsApp list:', error);
    return false;
  }
}

// Check if WhatsApp is configured
export function isWhatsAppConfigured(): boolean {
  return !!(EVOLUTION_API_URL && EVOLUTION_API_KEY);
}

// AI Router for WhatsApp — Natural language → Tool execution
export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  handler: (params: any) => Promise<string>;
}

export class WhatsAppAIRouter {
  private tools: Map<string, Tool> = new Map();

  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  async route(message: string, context?: any): Promise<{ type: 'text' | 'tool'; content: string }> {
    // Simple keyword matching for now
    // In production, this would use Alibaba Qwen+ or similar
    const lowerMsg = message.toLowerCase();

    for (const [name, tool] of this.tools) {
      if (lowerMsg.includes(name.toLowerCase()) || lowerMsg.includes(tool.description.toLowerCase())) {
        try {
          const result = await tool.handler(context || {});
          return { type: 'tool', content: result };
        } catch (error) {
          return { type: 'text', content: `Erro ao executar ${name}: ${error}` };
        }
      }
    }

    return { type: 'text', content: message };
  }
}

export default {
  sendTextMessage,
  sendButtonMessage,
  sendListMessage,
  formatPhoneNumber,
  isWhatsAppConfigured,
  WhatsAppAIRouter,
};

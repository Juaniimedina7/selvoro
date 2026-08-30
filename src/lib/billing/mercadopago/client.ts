import { Invoice, MercadoPagoConfig, PreApproval } from "mercadopago";

// Singleton del SDK de Mercado Pago, mismo patrón que getLlm() en lib/llm/client.ts.

let cachedConfig: MercadoPagoConfig | null = null;

function getConfig(): MercadoPagoConfig {
  if (!cachedConfig) {
    const accessToken = process.env.MP_ACCESS_TOKEN?.trim();
    if (!accessToken) {
      throw new Error(
        "Falta MP_ACCESS_TOKEN. Configurá las credenciales de Mercado Pago en .env.local.",
      );
    }
    cachedConfig = new MercadoPagoConfig({ accessToken });
  }
  return cachedConfig;
}

export function getPreApprovalClient(): PreApproval {
  return new PreApproval(getConfig());
}

/** Recursos "invoice" = cobros individuales de una suscripción (authorized_payments). */
export function getInvoiceClient(): Invoice {
  return new Invoice(getConfig());
}

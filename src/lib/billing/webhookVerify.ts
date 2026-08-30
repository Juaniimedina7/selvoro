import { createHmac, timingSafeEqual } from "node:crypto";

// Valida la firma x-signature de un webhook de Mercado Pago.
// Manifest oficial: "id:{data.id};request-id:{x-request-id};ts:{ts};"
// https://www.mercadopago.com.co/developers/es/docs/checkout-pro/additional-content/notifications/webhooks

export function verifyMercadoPagoSignature(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}): boolean {
  const { xSignature, xRequestId, dataId } = params;
  const secret = process.env.MP_WEBHOOK_SECRET?.trim();
  if (!secret || !xSignature || !xRequestId || !dataId) return false;

  const parts = Object.fromEntries(
    xSignature.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k?.trim(), v?.trim()];
    }),
  );
  const ts = parts.ts;
  const receivedHash = parts.v1;
  if (!ts || !receivedHash) return false;

  // MP indica convertir data.id a minúsculas si trae letras.
  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`;
  const computedHash = createHmac("sha256", secret).update(manifest).digest("hex");

  const a = Buffer.from(computedHash, "utf8");
  const b = Buffer.from(receivedHash, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

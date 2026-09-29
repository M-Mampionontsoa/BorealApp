import type { CrmPayload } from "@/lib/leads"

/**
 * Envoi du lead vers le webhook qui simule le CRM (webhook.site, Zapier,
 * n8n, un vrai CRM…). L'URL vient de la variable d'environnement
 * `CRM_WEBHOOK_URL` : rien n'est codé en dur.
 *
 * La fonction ne lève jamais d'exception : elle retourne un résultat que la
 * route peut traduire en réponse HTTP. Le webhook est un service externe,
 * donc lent, indisponible ou foireux font partie du fonctionnement normal.
 */

const CRM_TIMEOUT_MS = 8_000
const DETAIL_MAX_LENGTH = 300

export type CrmResult =
  | { ok: true; detail: string }
  | { ok: false; detail: string }

function getWebhookUrl(): string | null {
  const url = process.env.CRM_WEBHOOK_URL?.trim()
  return url ? url : null
}

/** Hôte du webhook configuré, pour l'afficher dans l'admin. */
export function getCrmWebhookLabel(): string {
  const url = getWebhookUrl()
  if (!url) return "Non configurée"

  try {
    return new URL(url).host
  } catch {
    return "URL invalide"
  }
}

function truncate(value: string): string {
  return value.length > DETAIL_MAX_LENGTH
    ? `${value.slice(0, DETAIL_MAX_LENGTH)}…`
    : value
}

export async function sendLeadToCrm(payload: CrmPayload): Promise<CrmResult> {
  const url = getWebhookUrl()
  if (!url) {
    return {
      ok: false,
      detail: "CRM_WEBHOOK_URL n'est pas définie.",
    }
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(CRM_TIMEOUT_MS),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => "")
      return {
        ok: false,
        detail: `Réponse ${response.status} du CRM${body ? ` : ${truncate(body)}` : ""}`,
      }
    }

    return { ok: true, detail: `HTTP ${response.status}` }
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return { ok: false, detail: `Délai dépassé après ${CRM_TIMEOUT_MS} ms` }
    }
    return {
      ok: false,
      detail: truncate(error instanceof Error ? error.message : String(error)),
    }
  }
}

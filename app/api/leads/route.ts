import { sendLeadToCrm } from "@/lib/crm"
import { estimateProject } from "@/lib/estimation"
import {
  CRM_DELIVERY,
  LEAD_ERROR,
  toCrmPayload,
  type Lead,
  type LeadErrorResponse,
} from "@/lib/leads"
import {
  newLeadId,
  saveLead,
  updateLeadCrmStatus,
} from "@/lib/leads-store"
import { checkRateLimit, getClientKey } from "@/lib/rate-limit"
import { estimatorSchema } from "@/lib/validation"

/**
 * `POST /api/leads` — réception d'une soumission.
 *
 * Le navigateur n'est jamais une source de vérité : le corps de la requête
 * repasse par le même schéma Zod que le formulaire, et le montant est
 * recalculé ici avec `estimateProject` avant d'être stocké et transmis.
 */

const MAX_BODY_BYTES = 16_384

function error(
  status: number,
  body: LeadErrorResponse,
  headers?: HeadersInit
): Response {
  return Response.json(body, { status, headers })
}

export async function POST(request: Request): Promise<Response> {
  const limit = checkRateLimit(getClientKey(request.headers))
  if (!limit.allowed) {
    return error(429, {
      ok: false,
      code: LEAD_ERROR.rateLimited,
      message:
        "Trop de demandes envoyées. Patientez une minute avant de réessayer.",
    })
  }

  const raw = await request.text()
  if (raw.length > MAX_BODY_BYTES) {
    return error(413, {
      ok: false,
      code: LEAD_ERROR.invalidJson,
      message: "La demande est trop volumineuse.",
    })
  }

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return error(400, {
      ok: false,
      code: LEAD_ERROR.invalidJson,
      message: "La demande reçue n'était pas du JSON valide.",
    })
  }

  const parsed = estimatorSchema.safeParse(payload)
  if (!parsed.success) {
    const errors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path.join(".") || "formulaire"
      errors[field] ??= issue.message
    }

    return error(422, {
      ok: false,
      code: LEAD_ERROR.validation,
      message: "Certaines informations sont invalides ou manquantes.",
      errors,
    })
  }

  const { projectType, material, areaSqFt, slope, demolition, ...contact } =
    parsed.data

  // Recalcul serveur : le client n'a jamais envoyé de montant, donc il n'y a
  // rien à vérifier ni à réconcilier — seulement à recalculer.
  const estimate = estimateProject({
    projectType,
    material,
    areaSqFt,
    slope,
    demolition,
  })

  const lead: Lead = {
    id: newLeadId(),
    receivedAt: new Date().toISOString(),
    contact,
    project: { projectType, material, areaSqFt, slope, demolition },
    estimate,
    crm: { status: CRM_DELIVERY.failed, detail: "En attente d'envoi" },
  }

  // Le lead est écrit avant l'appel externe : un CRM hors service ne doit
  // jamais faire perdre la soumission.
  await saveLead(lead)

  const delivery = await sendLeadToCrm(toCrmPayload(lead))
  await updateLeadCrmStatus(lead.id, {
    status: delivery.ok ? CRM_DELIVERY.sent : CRM_DELIVERY.failed,
    detail: delivery.detail,
  })

  if (!delivery.ok) {
    // 502 : la demande est acceptée et conservée, c'est notre dépendance
    // externe qui a échoué. Le message l'explique sans blaming l'utilisateur.
    return error(502, {
      ok: false,
      code: LEAD_ERROR.crmUnavailable,
      message:
        "Votre demande est bien enregistrée, mais nous n'avons pas pu la " +
        "transmettre à notre système de suivi pour l'instant. Un estimateur " +
        "vous contactera quand même sous un jour ouvrable.",
    })
  }

  return Response.json(
    {
      ok: true,
      leadId: lead.id,
      receivedAt: lead.receivedAt,
      estimate,
      crm: CRM_DELIVERY.sent,
    },
    { status: 201 }
  )
}

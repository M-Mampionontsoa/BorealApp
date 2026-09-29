import {
  MATERIAL_LABELS,
  PROJECT_TYPE_LABELS,
  SLOPE_LABELS,
  type Estimate,
  type ProjectInput,
} from "@/lib/estimation"
import type { EstimatorValues } from "@/lib/validation"

export const CRM_DELIVERY = {
  sent: "sent",
  failed: "failed",
} as const

export type CrmDelivery = (typeof CRM_DELIVERY)[keyof typeof CRM_DELIVERY]

export const CRM_DELIVERY_LABELS: Record<CrmDelivery, string> = {
  sent: "Transmis au CRM",
  failed: "Échec de transmission",
}

export type Contact = Pick<
  EstimatorValues,
  "fullName" | "email" | "phone" | "city" | "message"
>

/**
 * Un lead = les coordonnées, le projet décrit par le visiteur et
 * l'estimation **recalculée côté serveur**. Le montant n'est jamais repris
 * du navigateur : il est reconstruit à partir du projet validé.
 */
export type Lead = {
  id: string
  receivedAt: string
  contact: Contact
  project: ProjectInput
  estimate: Estimate
  crm: {
    status: CrmDelivery
    /** Détail technique, jamais affiché au visiteur. */
    detail: string
  }
}

/**
 * Charge utile envoyée au webhook qui simule le CRM. Les libellés français
 * voyagent avec les valeurs : un CRM n'a pas à connaître nos clés internes.
 */
export type CrmPayload = {
  event: "lead.created"
  id: string
  receivedAt: string
  source: "estimateur-boreal"
  contact: Contact
  project: {
    type: ProjectInput["projectType"]
    typeLabel: string
    material: ProjectInput["material"]
    materialLabel: string
    areaSqFt: number
    slope: ProjectInput["slope"]
    slopeLabel: string
    demolition: boolean
  }
  estimate: {
    subtotal: number
    rangeLow: number
    rangeHigh: number
    tps: number
    tvq: number
    total: number
    currency: "CAD"
  }
}

export const LEAD_ERROR = {
  invalidJson: "invalid_json",
  validation: "validation",
  rateLimited: "rate_limited",
  crmUnavailable: "crm_unavailable",
} as const

export type LeadErrorCode =
  (typeof LEAD_ERROR)[keyof typeof LEAD_ERROR]

export type LeadCreatedResponse = {
  ok: true
  leadId: string
  receivedAt: string
  /** L'estimation telle que recalculée par le serveur. */
  estimate: Estimate
  crm: CrmDelivery
}

export type LeadErrorResponse = {
  ok: false
  code: LeadErrorCode
  /** Message affichable tel quel au visiteur. */
  message: string
  /** Messages par champ, pour `setError` côté formulaire. */
  errors?: Record<string, string>
}

export type LeadResponse = LeadCreatedResponse | LeadErrorResponse

export function toCrmPayload(lead: Lead): CrmPayload {
  const { project, estimate, contact } = lead

  return {
    event: "lead.created",
    id: lead.id,
    receivedAt: lead.receivedAt,
    source: "estimateur-boreal",
    contact,
    project: {
      type: project.projectType,
      typeLabel: PROJECT_TYPE_LABELS[project.projectType],
      material: project.material,
      materialLabel: MATERIAL_LABELS[project.material],
      areaSqFt: project.areaSqFt,
      slope: project.slope,
      slopeLabel: SLOPE_LABELS[project.slope],
      demolition: project.demolition,
    },
    estimate: {
      subtotal: estimate.subtotal,
      rangeLow: estimate.rangeLow,
      rangeHigh: estimate.rangeHigh,
      tps: estimate.tps,
      tvq: estimate.tvq,
      total: estimate.total,
      currency: "CAD",
    },
  }
}

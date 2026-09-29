export const PROJECT_TYPES = {
  remplacementComplet: "remplacementComplet",
  reparation: "reparation",
  nouvelleConstruction: "nouvelleConstruction",
} as const

export const MATERIALS = {
  bardeauxAsphalte: "bardeauxAsphalte",
  tole: "tole",
  membraneElastomere: "membraneElastomere",
} as const

export const SLOPES = {
  faible: "faible",
  moyenne: "moyenne",
  forte: "forte",
} as const

export type ProjectType = (typeof PROJECT_TYPES)[keyof typeof PROJECT_TYPES]
export type Material = (typeof MATERIALS)[keyof typeof MATERIALS]
export type Slope = (typeof SLOPES)[keyof typeof SLOPES]

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  remplacementComplet: "Remplacement complet",
  reparation: "Réparation",
  nouvelleConstruction: "Nouvelle construction",
}

export const MATERIAL_LABELS: Record<Material, string> = {
  bardeauxAsphalte: "Bardeaux d'asphalte",
  tole: "Tôle",
  membraneElastomere: "Membrane élastomère",
}

export const SLOPE_LABELS: Record<Slope, string> = {
  faible: "Faible",
  moyenne: "Moyenne",
  forte: "Forte",
}

export const RATES_PER_SQ_FT: Record<Material, number> = {
  bardeauxAsphalte: 6.5,
  tole: 11.0,
  membraneElastomere: 9.0,
}

export const SLOPE_MULTIPLIERS: Record<Slope, number> = {
  faible: 1.0,
  moyenne: 1.15,
  forte: 1.35,
}

export const PROJECT_TYPE_FACTORS: Record<ProjectType, number> = {
  remplacementComplet: 1.0,
  reparation: 0.35,
  nouvelleConstruction: 0.9,
}

export const DEMOLITION_RATE_PER_SQ_FT = 1.75
export const MINIMUM_SUBTOTAL = 750

export const TPS_RATE = 0.05
export const TVQ_RATE = 0.09975

export const ESTIMATED_RANGE_LOW = 0.9
export const ESTIMATED_RANGE_HIGH = 1.1

export const AREA_MIN = 300
export const AREA_MAX = 10_000

export type ProjectInput = {
  projectType: ProjectType
  material: Material
  areaSqFt: number
  slope: Slope
  demolition: boolean
}

export type Estimate = {
  base: number
  demolition: number
  subtotal: number
  rangeLow: number
  rangeHigh: number
  tps: number
  tvq: number
  total: number
  appliedMinimum: boolean
}

const roundToCents = (value: number) => Math.round(value * 100) / 100

export function estimateProject(input: ProjectInput): Estimate {
  const base = input.areaSqFt * RATES_PER_SQ_FT[input.material]

  const demolition =
    input.demolition && input.projectType === PROJECT_TYPES.remplacementComplet
      ? input.areaSqFt * DEMOLITION_RATE_PER_SQ_FT
      : 0

  const rawSubtotal =
    (base + demolition) * PROJECT_TYPE_FACTORS[input.projectType]

  const appliedMinimum = rawSubtotal < MINIMUM_SUBTOTAL
  const subtotal = appliedMinimum ? MINIMUM_SUBTOTAL : rawSubtotal

  const tps = subtotal * TPS_RATE
  const tvq = subtotal * TVQ_RATE

  return {
    base: roundToCents(base),
    demolition: roundToCents(demolition),
    subtotal: roundToCents(subtotal),
    rangeLow: roundToCents(subtotal * ESTIMATED_RANGE_LOW),
    rangeHigh: roundToCents(subtotal * ESTIMATED_RANGE_HIGH),
    tps: roundToCents(tps),
    tvq: roundToCents(tvq),
    total: roundToCents(subtotal + tps + tvq),
    appliedMinimum,
  }
}

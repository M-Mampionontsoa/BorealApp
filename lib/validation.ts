import { z } from "zod"

import {
  AREA_MAX,
  AREA_MIN,
  MATERIALS,
  PROJECT_TYPES,
  SLOPES,
} from "@/lib/estimation"

export const projectSchema = z.object({
  projectType: z.enum(PROJECT_TYPES, {
    error: "Choisissez un type de projet.",
  }),
  material: z.enum(MATERIALS, {
    error: "Choisissez un matériau.",
  }),
  areaSqFt: z
    .number({ error: "Entrez une superficie en pieds carrés." })
    .int("La superficie doit être un nombre entier.")
    .min(AREA_MIN, `La superficie doit être d'au moins ${AREA_MIN} pi².`)
    .max(AREA_MAX, `La superficie ne peut pas dépasser ${AREA_MAX} pi².`),
  slope: z.enum(SLOPES, { error: "Choisissez une pente." }),
  demolition: z.boolean(),
})

export const contactSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Entrez votre nom complet.")
    .min(3, "Entrez votre nom complet."),
  email: z
    .string()
    .trim()
    .min(1, "Entrez votre courriel.")
    .email("Entrez une adresse courriel valide."),
  phone: z
    .string()
    .trim()
    .min(1, "Entrez votre numéro de téléphone.")
    .regex(
      /^[\d\s().+-]{10,}$/,
      "Entrez un numéro de téléphone valide (10 chiffres)."
    ),
  city: z
    .string()
    .trim()
    .min(1, "Entrez votre ville.")
    .min(2, "Entrez le nom de votre ville."),
  message: z
    .string()
    .trim()
    .max(500, "Votre message ne doit pas dépasser 500 caractères.")
    .optional()
    .or(z.literal("")),
})

export const estimatorSchema = projectSchema.merge(contactSchema)

export type ProjectValues = z.infer<typeof projectSchema>
export type ContactValues = z.infer<typeof contactSchema>
export type EstimatorValues = z.infer<typeof estimatorSchema>

/**
 * Valeurs du formulaire pendant la saisie : les champs de l'étape 1 sont
 * encore vides au départ, donc facultatifs jusqu'à validation.
 */
export type EstimatorFormValues = Partial<ProjectValues> &
  Omit<ContactValues, "message"> & {
    demolition: boolean
    message: string
  }

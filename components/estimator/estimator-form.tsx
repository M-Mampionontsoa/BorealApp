"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react"
import { useForm, type FieldPath, type Resolver } from "react-hook-form"

import { ContactStep } from "@/components/estimator/contact-step"
import { EstimateStep } from "@/components/estimator/estimate-step"
import { ProjectStep } from "@/components/estimator/project-step"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Form } from "@/components/ui/form"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  MATERIAL_LABELS,
  PROJECT_TYPE_LABELS,
  SLOPE_LABELS,
} from "@/lib/estimation"
import { formatCurrency, formatNumber } from "@/lib/format"
import type { LeadCreatedResponse, LeadResponse } from "@/lib/leads"
import {
  estimatorSchema,
  type EstimatorFormValues,
  type EstimatorValues,
} from "@/lib/validation"

const STEPS = [
  { id: "projet", title: "Le projet" },
  { id: "estimation", title: "L'estimation" },
  { id: "coordonnees", title: "Vos coordonnées" },
] as const

const PROJECT_FIELDS: FieldPath<EstimatorFormValues>[] = [
  "projectType",
  "material",
  "areaSqFt",
  "slope",
  "demolition",
]

const DEFAULT_VALUES: EstimatorFormValues = {
  projectType: undefined,
  material: undefined,
  areaSqFt: undefined,
  slope: undefined,
  demolition: false,
  fullName: "",
  email: "",
  phone: "",
  city: "",
  message: "",
}

const GENERIC_ERROR =
  "Impossible de communicates avec le serveur. Vérifiez votre connexion et réessayez."

function Confirmation({ onReset }: { onReset: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="size-5 text-green-600" aria-hidden />
          Demande reçue
        </CardTitle>
        <CardDescription>
          Merci! Un estimateur de Toitures Boréal vous contactera sous un jour
          ouvrable pour valider les détails.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          Cette estimation est indicative et ne constitue pas une soumission
          ferme. Le prix final est confirmé après une visite sur place.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" onClick={onReset}>
          Faire une autre estimation
        </Button>
      </CardFooter>
    </Card>
  )
}

export function EstimatorForm() {
  const [stepIndex, setStepIndex] = React.useState(0)
  const [submission, setSubmission] = React.useState<{
    values: EstimatorValues
    response: LeadCreatedResponse
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  const form = useForm<EstimatorFormValues>({
    resolver: zodResolver(estimatorSchema) as unknown as Resolver<EstimatorFormValues>,
    defaultValues: DEFAULT_VALUES,
    mode: "onTouched",
  })

  const goTo = async (index: number) => {
    if (index > stepIndex) {
      const valid = await form.trigger(PROJECT_FIELDS)
      if (!valid) return
    }
    setStepIndex(index)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    // Le resolver a déjà validé; on revalide pour obtenir le type complet.
    const parsed = estimatorSchema.safeParse(values)
    if (!parsed.success) return

    setSubmitError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      })

      const body = (await response.json().catch(() => null)) as LeadResponse | null

      if (!body) {
        setSubmitError(GENERIC_ERROR)
        return
      }

      if (!body.ok) {
        // Le serveur a revalidé : on rattache chaque message à son champ.
        for (const [field, message] of Object.entries(body.errors ?? {})) {
          form.setError(field as FieldPath<EstimatorFormValues>, {
            type: "server",
            message,
          })
        }
        // Si l'erreur porte sur l'étape 1, on ramène le visiteur là-bas.
        const hasProjectError = Object.keys(body.errors ?? {}).some((field) =>
          PROJECT_FIELDS.includes(field as FieldPath<EstimatorFormValues>)
        )
        if (hasProjectError) setStepIndex(0)

        setSubmitError(body.message)
        return
      }

      setSubmission({ values: parsed.data, response: body })
    } catch {
      setSubmitError(GENERIC_ERROR)
    } finally {
      setIsSubmitting(false)
    }
  })

  if (submission) {
    return (
      <div className="grid gap-4">
        <Confirmation
          onReset={() => {
            form.reset(DEFAULT_VALUES)
            setSubmission(null)
            setSubmitError(null)
            setStepIndex(0)
          }}
        />
        <Card size="sm">
          <CardHeader>
            <CardTitle>Rappel de votre estimation</CardTitle>
            <CardDescription>
              Montants recalculés par notre serveur au moment de l&apos;envoi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-1 text-sm">
              <SummaryRow
                label="Projet"
                value={PROJECT_TYPE_LABELS[submission.values.projectType]}
              />
              <SummaryRow
                label="Matériau"
                value={MATERIAL_LABELS[submission.values.material]}
              />
              <SummaryRow
                label="Superficie"
                value={`${formatNumber(submission.values.areaSqFt)} pi²`}
              />
              <SummaryRow
                label="Pente"
                value={SLOPE_LABELS[submission.values.slope]}
              />
              <SummaryRow
                label="Démolition"
                value={submission.values.demolition ? "Oui" : "Non"}
              />
              <Separator className="my-2" />
              <SummaryRow
                label="Fourchette estimée"
                value={`${formatCurrency(submission.response.estimate.rangeLow)} – ${formatCurrency(submission.response.estimate.rangeHigh)}`}
              />
              <SummaryRow
                label="Total taxes incluses"
                value={formatCurrency(submission.response.estimate.total)}
                emphasis
              />
            </dl>
          </CardContent>
        </Card>
      </div>
    )
  }

  const step = STEPS[stepIndex]
  const isLastStep = stepIndex === STEPS.length - 1

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estimateur de soumission</CardTitle>
        <CardDescription>
          Étape {stepIndex + 1} sur {STEPS.length} — {step.title}
        </CardDescription>
        <Progress
          value={((stepIndex + 1) / STEPS.length) * 100}
          aria-label="Progression"
          className="mt-2"
        />
      </CardHeader>

      <Form {...form}>
        <form onSubmit={onSubmit} noValidate>
          <CardContent className="grid gap-4">
            {submitError ? (
              <Alert variant="destructive">
                <AlertCircle aria-hidden />
                <AlertTitle>Le formulaire n&apos;a pas pu être envoyé</AlertTitle>
                <AlertDescription>
                  {submitError} Vos informations sont toujours dans le
                  formulaire — vous pouvez réessayer.
                </AlertDescription>
              </Alert>
            ) : null}

            <div role="group" aria-label={STEPS[0].title} hidden={step.id !== "projet"}>
              <ProjectStep />
            </div>
            <div
              role="group"
              aria-label={STEPS[1].title}
              hidden={step.id !== "estimation"}
            >
              <EstimateStep />
            </div>
            <div
              role="group"
              aria-label={STEPS[2].title}
              hidden={step.id !== "coordonnees"}
            >
              <ContactStep />
            </div>
          </CardContent>

          <CardFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => goTo(stepIndex - 1)}
              disabled={stepIndex === 0 || isSubmitting}
            >
              <ArrowLeft aria-hidden />
              Retour
            </Button>

            {isLastStep ? (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Envoi en cours…" : "Obtenir mon estimation"}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => goTo(stepIndex + 1)}
                disabled={isSubmitting}
              >
                Continuer
                <ArrowRight aria-hidden />
              </Button>
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}

function SummaryRow({
  label,
  value,
  emphasis = false,
}: {
  label: string
  value: string
  emphasis?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={emphasis ? "font-semibold tabular-nums" : "tabular-nums"}>
        {value}
      </dd>
    </div>
  )
}

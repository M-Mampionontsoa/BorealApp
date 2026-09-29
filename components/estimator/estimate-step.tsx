"use client"

import { useFormContext, useWatch, type Control } from "react-hook-form"

import { MINIMUM_SUBTOTAL, estimateProject, type Estimate } from "@/lib/estimation"
import { formatCurrency } from "@/lib/format"
import type { EstimatorFormValues } from "@/lib/validation"

/**
 * Doit être appelé sous un `<Form>` (FormProvider) ou avec un `control` explicite.
 */
export function useEstimate(
  control: Control<EstimatorFormValues>
): Estimate | null {
  const values = useWatch({
    control,
    name: ["projectType", "material", "areaSqFt", "slope", "demolition"],
  })

  const [projectType, material, areaSqFt, slope, demolition] = values

  if (
    projectType == null ||
    material == null ||
    slope == null ||
    typeof areaSqFt !== "number" ||
    !Number.isFinite(areaSqFt) ||
    areaSqFt <= 0
  ) {
    return null
  }

  return estimateProject({ projectType, material, areaSqFt, slope, demolition })
}

function Line({
  label,
  value,
  emphasis = false,
}: {
  label: string
  value: string
  emphasis?: boolean
}) {
  return (
    <div
      className={
        emphasis
          ? "flex items-baseline justify-between gap-4 border-t pt-3 font-semibold"
          : "flex items-baseline justify-between gap-4"
      }
    >
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}

export function EstimateStep() {
  const { control } = useFormContext<EstimatorFormValues>()
  const estimate = useEstimate(control)

  if (!estimate) {
    return (
      <p className="text-muted-foreground">
        Renseignez votre projet à l&apos;étape précédente pour voir
        l&apos;estimation.
      </p>
    )
  }

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="text-base font-medium">Fourchette estimée</h3>
        <p className="text-2xl font-semibold tabular-nums">
          {formatCurrency(estimate.rangeLow)} – {formatCurrency(estimate.rangeHigh)}
        </p>
      </div>

      <dl className="grid gap-2 text-sm">
        <Line
          label="Sous-total"
          value={formatCurrency(estimate.subtotal)}
        />
        {estimate.demolition > 0 ? (
          <Line
            label="dont démolition"
            value={formatCurrency(estimate.demolition)}
          />
        ) : null}
        <Line label="TPS (5 %)" value={formatCurrency(estimate.tps)} />
        <Line label="TVQ (9,975 %)" value={formatCurrency(estimate.tvq)} />
        <Line
          label="Total taxes incluses"
          value={formatCurrency(estimate.total)}
          emphasis
        />
      </dl>

      {estimate.appliedMinimum ? (
        <p className="text-muted-foreground text-sm">
          Un sous-total minimum de {formatCurrency(MINIMUM_SUBTOTAL)} s&apos;applique
          aux petits projets.
        </p>
      ) : null}
    </div>
  )
}

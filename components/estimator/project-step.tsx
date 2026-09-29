"use client"

import { cn } from "cn"

import { ChoiceField } from "@/components/estimator/choice-field"
import { Checkbox } from "@/components/ui/checkbox"
import { useWatch } from "react-hook-form"

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AREA_MAX,
  AREA_MIN,
  MATERIALS,
  MATERIAL_LABELS,
  PROJECT_TYPES,
  PROJECT_TYPE_FACTORS,
  PROJECT_TYPE_LABELS,
  RATES_PER_SQ_FT,
  SLOPES,
  SLOPE_LABELS,
  SLOPE_MULTIPLIERS,
  type Material,
  type ProjectType,
  type Slope,
} from "@/lib/estimation"
import { formatCurrency, formatNumber } from "@/lib/format"

const decimal = (value: number) => value.toFixed(2).replace(".", ",")

const PROJECT_TYPE_OPTIONS = (Object.keys(PROJECT_TYPES) as ProjectType[]).map(
  (value) => ({
    value,
    label: PROJECT_TYPE_LABELS[value],
    hint: `Facteur × ${decimal(PROJECT_TYPE_FACTORS[value])}`,
  })
)

const MATERIAL_OPTIONS = (Object.keys(MATERIALS) as Material[]).map((value) => ({
  value,
  label: MATERIAL_LABELS[value],
  hint: `${formatCurrency(RATES_PER_SQ_FT[value])} / pi²`,
}))

const SLOPE_OPTIONS = (Object.keys(SLOPES) as Slope[]).map((value) => ({
  value,
  label: SLOPE_LABELS[value],
  hint: `Multiplicateur × ${decimal(SLOPE_MULTIPLIERS[value])}`,
}))

type DemolitionOptionProps = {
  disabled: boolean
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  /** Injecté par FormControl (Slot). */
  id?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean
}

function DemolitionOption({
  disabled,
  checked,
  onCheckedChange,
  id,
  ...aria
}: DemolitionOptionProps) {
  return (
    <Label
      htmlFor={id}
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 font-normal",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      )}
    >
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        {...aria}
      />
      Démolition de l&apos;ancien toit
    </Label>
  )
}

export function ProjectStep() {
  const projectType = useWatch({ name: "projectType" })
  const demolitionDisabled = projectType !== PROJECT_TYPES.remplacementComplet

  return (
    <div className="grid gap-6">
      <FormField
        name="projectType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Type de projet</FormLabel>
            <FormControl>
              <ChoiceField
                id="projectType"
                options={PROJECT_TYPE_OPTIONS}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="material"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Matériau</FormLabel>
            <FormControl>
              <ChoiceField
                id="material"
                options={MATERIAL_OPTIONS}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="areaSqFt"
        render={({ field }) => (
          <FormItem>
            <FormLabel htmlFor="areaSqFt">Superficie (pi²)</FormLabel>
            <FormControl>
              <Input
                id="areaSqFt"
                type="number"
                inputMode="numeric"
                min={AREA_MIN}
                max={AREA_MAX}
                step={1}
                value={field.value ?? ""}
                onBlur={field.onBlur}
                onChange={(event) =>
                  field.onChange(
                    event.target.value === "" ? undefined : Number(event.target.value)
                  )
                }
              />
            </FormControl>
            <FormDescription>
              Entre {formatNumber(AREA_MIN)} et {formatNumber(AREA_MAX)} pi².
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="slope"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Pente du toit</FormLabel>
            <FormControl>
              <ChoiceField
                id="slope"
                options={SLOPE_OPTIONS}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="demolition"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <DemolitionOption
                checked={field.value ?? false}
                onCheckedChange={(checked) => field.onChange(checked)}
                disabled={demolitionDisabled}
              />
            </FormControl>
            <FormDescription>
              {demolitionDisabled
                ? "Disponible uniquement pour un remplacement complet."
                : "1,75 $ / pi² ajoutés au sous-total."}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

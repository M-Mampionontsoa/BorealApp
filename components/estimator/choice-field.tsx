"use client"

import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "cn"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export type ChoiceOption<TValue extends string> = {
  value: TValue
  label: string
  hint?: string
}

type ChoiceFieldProps<TValue extends string> = {
  options: readonly ChoiceOption<TValue>[]
  value: TValue | undefined
  onValueChange: (value: TValue) => void
  id: string
  disabled?: boolean
  onBlur?: () => void
  "aria-describedby"?: string
  "aria-invalid"?: boolean
  className?: string
}

function ChoiceField<TValue extends string>({
  options,
  value,
  onValueChange,
  id,
  disabled,
  onBlur,
  className,
  ...aria
}: ChoiceFieldProps<TValue>) {
  return (
    <RadioGroup
      id={id}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      onBlur={onBlur}
      className={cn("gap-2", className)}
      {...aria}
    >
      {options.map((option) => {
        const optionId = `${id}-${option.value}`
        const isChecked = value === option.value

        return (
          <Label
            key={option.value}
            htmlFor={optionId}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50"
            )}
          >
            <RadioGroupItem
              id={optionId}
              value={option.value}
              className="mt-0.5"
            />
            <span className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5 leading-snug font-medium">
                {option.label}
                {isChecked ? <Check className="size-3.5" aria-hidden /> : null}
              </span>
              {option.hint ? (
                <span className="text-muted-foreground text-xs">
                  {option.hint}
                </span>
              ) : null}
            </span>
          </Label>
        )
      })}
    </RadioGroup>
  )
}

export { ChoiceField }

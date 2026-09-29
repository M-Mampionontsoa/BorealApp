"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  PROJECT_TYPES,
  PROJECT_TYPE_LABELS,
  type ProjectType,
} from "@/lib/estimation"

const ALL = "tous"

const OPTIONS = (Object.keys(PROJECT_TYPES) as ProjectType[]).map((value) => ({
  value,
  label: PROJECT_TYPE_LABELS[value],
}))

/**
 * Le filtre vit dans l'URL (`?type=reparation`) plutôt que dans un état
 * local : la page reste un Server Component, le filtre survit à un
 * rechargement et le résultat est partageable.
 */
export function ProjectTypeFilter({
  value,
}: {
  value: ProjectType | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const onValueChange = (next: string) => {
    const query = next === ALL ? "" : `?type=${next}`
    startTransition(() => {
      router.push(`/admin/leads${query}`, { scroll: false })
    })
  }

  return (
    <Select
      value={value ?? ALL}
      onValueChange={onValueChange}
      disabled={isPending}
    >
      <SelectTrigger
        className="w-full sm:w-64"
        aria-label="Filtrer par type de projet"
      >
        <SelectValue placeholder="Type de projet" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Tous les types</SelectItem>
        {OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

import type { Metadata } from "next"
import Link from "next/link"

import { ProjectTypeFilter } from "@/components/admin/project-type-filter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getCrmWebhookLabel } from "@/lib/crm"
import {
  MATERIAL_LABELS,
  PROJECT_TYPES,
  PROJECT_TYPE_LABELS,
  SLOPE_LABELS,
  type ProjectType,
} from "@/lib/estimation"
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format"
import { CRM_DELIVERY } from "@/lib/leads"
import { listLeads } from "@/lib/leads-store"

export const metadata: Metadata = {
  title: "Leads — Toitures Boréal",
  description: "Soumissions reçues par l'estimateur.",
}

function toProjectType(value: string | string[] | undefined): ProjectType | null {
  const candidate = Array.isArray(value) ? value[0] : value
  return Object.values(PROJECT_TYPES).find((type) => type === candidate) ?? null
}

export default async function AdminLeadsPage({
  searchParams,
}: PageProps<"/admin/leads">) {
  const activeType = toProjectType((await searchParams).type)
  const [leads, allLeads] = await Promise.all([
    listLeads(activeType ? { projectType: activeType } : undefined),
    listLeads(),
  ])

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <header className="mb-6 grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Soumissions reçues
            </h1>
            <p className="text-muted-foreground text-sm">
              {formatNumber(allLeads.length)} lead
              {allLeads.length > 1 ? "s" : ""} au total
              {activeType
                ? ` — filtré sur « ${PROJECT_TYPE_LABELS[activeType]} »`
                : ""}
              .
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/">Retour à l&apos;estimateur</Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ProjectTypeFilter value={activeType} />
          {activeType ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/leads">Effacer le filtre</Link>
            </Button>
          ) : null}
          <Badge variant="outline" className="ml-auto">
            Webhook CRM : {getCrmWebhookLabel()}
          </Badge>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Leads</CardTitle>
          <CardDescription>
            Montants recalculés par le serveur au moment de la réception.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              {allLeads.length === 0
                ? "Aucune soumission pour le moment. Complétez l'estimateur pour en générer une."
                : "Aucun lead ne correspond à ce filtre."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reçue le</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Courriel</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Projet</TableHead>
                  <TableHead>Matériau</TableHead>
                  <TableHead className="text-right">Superficie</TableHead>
                  <TableHead>Pente</TableHead>
                  <TableHead>Démolition</TableHead>
                  <TableHead className="text-right">Fourchette</TableHead>
                  <TableHead className="text-right">Total TTC</TableHead>
                  <TableHead>CRM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(lead.receivedAt)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {lead.contact.fullName}
                    </TableCell>
                    <TableCell>
                      <a
                        href={`mailto:${lead.contact.email}`}
                        className="hover:underline"
                      >
                        {lead.contact.email}
                      </a>
                    </TableCell>
                    <TableCell>{lead.contact.phone}</TableCell>
                    <TableCell>{lead.contact.city}</TableCell>
                    <TableCell>
                      {PROJECT_TYPE_LABELS[lead.project.projectType]}
                    </TableCell>
                    <TableCell>
                      {MATERIAL_LABELS[lead.project.material]}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(lead.project.areaSqFt)} pi²
                    </TableCell>
                    <TableCell>{SLOPE_LABELS[lead.project.slope]}</TableCell>
                    <TableCell>
                      {lead.project.demolition ? "Oui" : "Non"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(lead.estimate.rangeLow)} –{" "}
                      {formatCurrency(lead.estimate.rangeHigh)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(lead.estimate.total)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          lead.crm.status === CRM_DELIVERY.sent
                            ? "secondary"
                            : "destructive"
                        }
                        title={lead.crm.detail}
                      >
                        {lead.crm.status === CRM_DELIVERY.sent
                          ? "Envoyé"
                          : "Échec"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption>
                Les montants sont indicatifs et confirmés après une visite sur
                place.
              </TableCaption>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

import Link from "next/link"

import { EstimatorForm } from "@/components/estimator/estimator-form"

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <header className="mb-8 grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Toitures Boréal
        </h1>
        <p className="text-muted-foreground">
          Obtenez une estimation instantanée pour votre projet de toiture.
        </p>
      </header>

      <EstimatorForm />

      <footer className="mt-10 text-center">
        <Link
          href="/admin/leads"
          className="text-muted-foreground text-xs hover:underline"
        >
          Espace interne — soumissions reçues
        </Link>
      </footer>
    </main>
  )
}

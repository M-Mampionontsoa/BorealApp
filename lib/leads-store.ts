import { randomUUID } from "node:crypto"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"

import type { Lead } from "@/lib/leads"

/**
 * Stockage des leads — volontairement minimal, mais derrière une interface
 * stable. En développement et en production sur un serveur Node, les leads
 * sont écrits dans `.data/leads.json`. Sur un runtime sans système de
 * fichiers inscriptible (fonctions Vercel), l'écriture échoue, on le signale
 * une fois dans les logs et on bascule sur le tampon mémoire du processus :
 * la démo fonctionne, mais les leads sont alors perdus au redémarrage.
 *
 * Brancher Vercel KV, Upstash ou Supabase = réimplémenter `saveLead`,
 * `listLeads` et `updateLeadCrmStatus` avec le même comportement.
 */

const MAX_LEADS = 500

const DATA_DIR = path.join(process.cwd(), ".data")
const DATA_FILE = path.join(DATA_DIR, "leads.json")

type StoreState = {
  leads: Lead[]
  loadedFromDisk: boolean
  /**
   * Lecture en cours, partagée entre appelants concurrents. Un booléen ne
   * suffit pas : il serait positionné avant l'`await`, donc un second appel
   * concurrent sortirait immédiatement avec un `leads` encore vide.
   */
  loading: Promise<void> | null
  warnedAboutDisk: boolean
}

const globalForLeads = globalThis as typeof globalThis & {
  __borealLeads?: StoreState
}

const state: StoreState = (globalForLeads.__borealLeads ??= {
  leads: [],
  loadedFromDisk: false,
  loading: null,
  warnedAboutDisk: false,
})

function isMissingFile(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === "ENOENT"
}

async function readFromDisk(): Promise<Lead[]> {
  try {
    const raw = await readFile(DATA_FILE, "utf8")
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Lead[]) : []
  } catch (error) {
    if (!isMissingFile(error)) {
      console.warn("[leads] Lecture du fichier impossible :", error)
    }
    return []
  }
}

async function writeToDisk(leads: Lead[]): Promise<boolean> {
  try {
    await mkdir(DATA_DIR, { recursive: true })
    // Écriture atomique : un fichier temporaire puis un renommage, pour ne
    // jamais laisser un JSON tronqué si le serveur s'arrête au milieu.
    const temporaryFile = `${DATA_FILE}.${process.pid}.tmp`
    await writeFile(temporaryFile, JSON.stringify(leads, null, 2), "utf8")
    await rename(temporaryFile, DATA_FILE)
    return true
  } catch (error) {
    if (!state.warnedAboutDisk) {
      state.warnedAboutDisk = true
      console.warn(
        "[leads] Stockage fichier indisponible, repli sur la mémoire du processus :",
        error
      )
    }
    return false
  }
}

async function ensureLoaded(): Promise<void> {
  if (state.loadedFromDisk) return
  // `??=` : le premier appelant crée la promesse, les suivants rejoignent
  // celle qui est déjà en vol au lieu d'en déclencher une deuxième lecture.
  state.loading ??= readFromDisk().then(
    (leads) => {
      state.leads = leads
      state.loadedFromDisk = true
      state.loading = null
    },
    (error: unknown) => {
      // Ne pas laisser une promesse rejetée en cache : l'appel suivant doit
      // pouvoir réessayer.
      state.loading = null
      throw error
    }
  )
  return state.loading
}

export function newLeadId(): string {
  return `lead_${randomUUID()}`
}

export async function saveLead(lead: Lead): Promise<void> {
  await ensureLoaded()
  state.leads.unshift(lead)
  if (state.leads.length > MAX_LEADS) state.leads.length = MAX_LEADS
  await writeToDisk(state.leads)
}

export async function listLeads(filter?: {
  projectType?: string
}): Promise<Lead[]> {
  await ensureLoaded()
  if (!filter?.projectType) return state.leads
  return state.leads.filter(
    (lead) => lead.project.projectType === filter.projectType
  )
}

export async function updateLeadCrmStatus(
  id: string,
  crm: Lead["crm"]
): Promise<void> {
  await ensureLoaded()
  const lead = state.leads.find((candidate) => candidate.id === id)
  if (!lead) return
  lead.crm = crm
  await writeToDisk(state.leads)
}

/** Utilitaire de développement : vide le store sans passer par le fichier. */
export async function resetLeads(): Promise<void> {
  state.leads = []
  state.loadedFromDisk = true
  await writeToDisk(state.leads)
}

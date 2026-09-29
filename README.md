# Toitures Boréal — Estimateur de soumission

Estimateur de prix en ligne pour un couvreur de la Rive-Nord. Formulaire
multi-étapes : le visiteur décrit son projet, obtient une estimation
instantanée, puis laisse ses coordonnées. La soumission est revalidée et
recalculée côté serveur, enregistrée, puis transmise à un webhook qui simule
le CRM.

## Stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (preset `radix-nova`, base Radix)
- **react-hook-form** + **Zod 4** pour la validation (partagée client/serveur)
- Lucide pour les icônes

## Démarrage

```bash
npm install
cp .env.example .env.local   # puis renseigner CRM_WEBHOOK_URL
npm run dev                  # http://localhost:3000
npm run build
npm run lint
```

`CRM_WEBHOOK_URL` peut rester vide en local : la soumission est quand même
enregistrée et l'interface affiche un message d'erreur explicite plutôt qu'un
écran blanc. C'est le comportement attendu quand le CRM est injoignable.

## Structure

```
app/
  layout.tsx                  Layout racine (lang="fr", métadonnées)
  page.tsx                    Page d'accueil : rend l'estimateur
  globals.css                 Thème shadcn (variables CSS, mode sombre)

  api/leads/route.ts          POST /api/leads — revalidation, recalcul, CRM
  admin/leads/page.tsx        Liste des leads reçus, filtre par type

lib/
  estimation.ts               LOGIQUE MÉTIER — fonction pure, sans React
  validation.ts               Schémas Zod + messages d'erreur en français
  format.ts                   Formatage monétaire et dates (fr-CA)
  utils.ts                    cn()

  leads.ts                    Types Lead / CrmPayload / réponses API
  leads-store.ts              Stockage des leads (fichier JSON, repli mémoire)
  crm.ts                      Envoi vers le webhook CRM, timeout, erreurs
  rate-limit.ts               Fenêtre de 5 requêtes/minute par IP

components/
  ui/                         Primitives shadcn (générées par le CLI)
  estimator/
    estimator-form.tsx        Orchestrateur : étapes, envoi API, confirmation
    project-step.tsx          Étape 1 — le projet
    estimate-step.tsx         Étape 2 — l'estimation
    contact-step.tsx          Étape 3 — les coordonnées
    choice-field.tsx          Groupe de radio-boutons façon carte
  admin/
    project-type-filter.tsx    Filtre par type de projet (pilote l'URL)
```

## Décisions de conception

**La logique de calcul est isolée.** `estimateProject()` dans
`lib/estimation.ts` est une fonction pure : mêmes entrées, mêmes sorties, aucun
hook, aucun import React. Elle est donc réutilisée telle quelle par la route
API — c'est ce qui rend le recalcul serveur possible sans duplicer les règles.

**Les tables de l'énoncé sont des constantes nommées** (`RATES_PER_SQ_FT`,
`SLOPE_MULTIPLIERS`, `PROJECT_TYPE_FACTORS`) et les libellés français vivent à
côté (`MATERIAL_LABELS`, etc.), ce qui évite de dupliquer des chaînes entre la
logic, l'interface et la charge utile envoyée au CRM.

**Un seul formulaire, trois étapes masquées.** Les étapes restent montées et
sont togglées avec `hidden`, ce qui préserve l'état quand l'utilisateur revient
en arrière. La validation par étape utilise `trigger()` sur les champs
concernés : impossible de passer à l'étape 2 avec une superficie invalide.

**Les règles conditionnelles sont gérées à la racine.** L'option « démolition »
n'est offerte que pour un remplacement complet (`useWatch` sur `projectType`),
et le calcul ignore la démolition si le type de projet ne le permet pas — la
règle est donc appliquée deux fois, côté interface et côté calcul.

**Le navigateur n'envoie aucun montant.** Le `POST` ne contient que les
réponses du visiteur. La route recharge le projet dans `estimateProject()` et
c'est ce total recalculé qui est stocké, affiché à l'écran de confirmation et
transmis au CRM. Un `total` trafiqué dans le corps de la requête n'a donc
aucun effet.

**Le lead est écrit avant l'appel externe.** Si le webhook échoue, la
soumission reste dans le store avec un statut CRM `failed` visible dans
`/admin/leads`. Un service tiers indisponible ne fait jamais perdre un lead.

## Règles de calcul implémentées

| Élément | Traitement |
|---|---|
| Base | `superficie × taux matériau × multiplicateur pente` |
| Démolition | `superficie × 1,75 $`, seulement si cochée **et** remplacement complet |
| Sous-total | `(base + démolition) × facteur du type`, plancher de 750 $ |
| Fourchette | `sous-total × 0,90` à `sous-total × 1,10` |
| TPS / TVQ | 5 % et 9,975 % du sous-total |
| Arrondi | Au cent, puis format `fr-CA` (`13 837,50 $`) |

## Niveau 1 — l'estimateur

- [x] Formulaire multi-étapes (projet / estimation / coordonnées)
- [x] Recalcul instantané au retour sur une étape antérieure
- [x] Validation côté client, messages en français
- [x] Écran de confirmation affichant le total **recalculé par le serveur**

## Niveau 2 — l'API et le CRM

- [x] `POST /api/leads` reçoit la soumission
- [x] Revalidation serveur avec le **même** schéma Zod que le formulaire
- [x] Recalcul de l'estimation côté serveur
- [x] Transmission JSON vers un webhook externe (`CRM_WEBHOOK_URL`)
- [x] Erreurs gérées : `400` / `413` / `422` / `429` / `502`, chacune avec un
      message affichable en français
- [x] `/admin/leads` : tableau shadcn avec filtre par type de projet

### Contrat de l'API

`POST /api/leads` — corps = un `estimatorSchema` valide (projet +
coordonnées, **sans** montant).

| Cas | Statut | `code` |
|---|---|---|
| Créé et transmis | `201` | — |
| JSON illisible | `400` | `invalid_json` |
| Corps trop volumineux (> 16 Ko) | `413` | `invalid_json` |
| Échec de validation | `422` | `validation` (+ `errors` par champ) |
| Trop de requêtes | `429` | `rate_limited` |
| CRM injoignable | `502` | `crm_unavailable` |

La réponse `201` renvoie l'estimation recalculée, que l'écran de confirmation
affiche telle quelle. La réponse `422` renvoie `errors`, un message par champ,
que le formulaire rattache à l'entrée concernée via `setError` — et si
l'erreur porte sur l'étape 1, l'utilisateur est ramené à cette étape.

### Le webhook CRM

`lib/crm.ts` envoie une charge utile autoportante : les **libellés français**
voyagent avec les clés (`"tole"` + `"Tôle"`), pour qu'un vrai CRM n'ait pas à
connaître notre modèle interne.

```json
{
  "event": "lead.created",
  "id": "lead_…",
  "receivedAt": "2026-09-29T09:58:39.070Z",
  "source": "estimateur-boreal",
  "contact": { "fullName": "…", "email": "…", "phone": "…", "city": "…", "message": "…" },
  "project": { "type": "tole", "typeLabel": "Tôle", "areaSqFt": 1200, "demolition": true, "…": "…" },
  "estimate": { "subtotal": 15300, "rangeLow": 13770, "rangeHigh": 16830, "tps": 765, "tvq": 1526.18, "total": 17591.18, "currency": "CAD" }
}
```

L'envoi a un délai maximal de 8 s (`AbortSignal.timeout`) et ne lève jamais :
il retourne `{ ok, detail }`, que la route traduit en statut HTTP. Un webhook
qui répond 500, qui expire ou qui n'est pas configuré produit tous la même
réponse utile au visiteur, et une ligne `Échec` dans l'admin.

### Stockage

`lib/leads-store.ts` écrit les leads dans `.data/leads.json` (écriture
atomique via fichier temporaire + renommage, 500 leads maximum). Si le
système de fichiers est inscriptible — c'est le cas sur Vercel — l'écriture
échoue, un avertissement est loggé une seule fois et le store bascule sur la
mémoire du processus : la démo fonctionne, mais les leads sont alors perdus au
redémarrage et sur les autres instances.

C'est le point que j'aurais poussé plus loin : brancher **Vercel KV** ou
**Upstash** ne demande que de réimplémenter `saveLead`, `listLeads` et
`updateLeadCrmStatus` avec le même comportement — les trois appelants n'ont
pas à changer.

### Sécurité et accès

`/admin/leads` est **publiquement accessible** dans cette version. C'est
acceptable pour une démo, pas pour la production : devant un vrai CRM, la
page passerait derrière un contrôle d'accès (middleware Next.js, `ADMIN_TOKEN`
en variable d'environnement, ou un fournisseur d'identité). Le rate limit de
`lib/rate-limit.ts` (5 requêtes/minute par IP) protège surtout le webhook
d'inondation ; il vit en mémoire et serait à remplacer par un compteur
partagé en multi-instance.

## Niveau 3 — l'intégration WordPress

Non implémenté. Voici ce que j'aurais fait, dans cet ordre.

### 1. Page `/realisations`

`app/realisations/page.tsx`, un Server Component qui lit l'API REST de
WordPress et affiche titre, date, extrait nettoyé et lien vers l'article.

- **Nettoyage du HTML** : l'extrait de WordPress arrive en HTML. Je le nettoie
  côté serveur avec une liste blanche de balises (`<a> <strong> <em> <p> <ul>
  <ol> <li>`) plutôt qu'avec une regex de suppression, puis je passe le
  résultat à `dangerouslySetInnerHTML`. Supprimer les balises par regex casse
  les attributs ; l'approche liste blanche échoue proprement sur ce qu'elle ne
  connaît pas.
- **Clé de route** : les articles sont des nœuds distincts, chacun avec son
  `id` et son `link`. Next.js 16 déduplique déjà les `fetch` vers la même URL
  dans un même rendu, donc la clé est naturelle.
- **Cache et revalidation** : `fetch(url, { next: { revalidate: 3600 } })`
  sur l'endpoint `/wp-json/wp/v2/posts?per_page=5&_embed`. Le rendu est
  statique, la page est servie depuis le cache, et la première requête après
  l'échéance la rafraîchit en arrière-plan.

```ts
const response = await fetch(
  `${process.env.WP_BASE_URL}/wp-json/wp/v2/posts?per_page=5&_embed`,
  { next: { revalidate: 3600 } }
)
```

`WP_BASE_URL` avec `https://wordpress.org/news` par défaut, pour qu'un
relecteur puisse lancer la page sans configuration.

- **États d'erreur** : si WordPress est lent ou hors ligne, la page rend un
  état vide (« Aucune réalisation à afficher pour le moment ») au lieu de
  faire tomber le site. Un `not-found` ou un `500` en amont ne doit pas
  casser la navigation.

### 2. Shortcode `[boreal_estimateur]` pour Elementor

Le dossier `/wordpress-plugin` contiendrait un plugin unique,
`boreal-estimateur.php`, avec quatre morceaux :

**a. L'enregistrement du shortcode**

```php
add_shortcode('boreal_estimateur', 'boreal_render_estimator');

function boreal_render_estimator($atts) {
    $atts = shortcode_atts(
        ['url' => 'https://boreal-estimator.vercel.app', 'hauteur' => '900px'],
        $atts
    );
    return sprintf(
        '<div class="boreal-embed" style="max-width:760px;margin:0 auto">
             <iframe src="%s?embed=1" title="Estimateur de soumission Toitures Boréal"
                     loading="lazy" style="width:100%%;border:0;height:%s"
                     onload="BorealEmbed.resize(this)"></iframe>
         </div>',
        esc_url($atts['url']),
        esc_attr($atts['hauteur'])
    );
}
```

Le paramètre `url` garde le plugin réutilisable si le client héberge
l'estimateur ailleurs.

**b. L'ajustement automatique de la hauteur**

C'est le point délicat, parce que la page hôte et l'iframe sont sur des
origines différentes. Le parent ne peut pas mesurer le DOM interne de l'iframe
: il faut que l'iframe *annonce* sa taille. Le mécanisme :

1. Dans l'estimateur, un composant client mesure son contenu
   (`ResizeObserver` sur la racine du formulaire) et fait un
   `postMessage` à la fenêtre parente à chaque changement de hauteur.
2. Un petit script dans le shortcode écoute ce message et ajuste
   `iframe.style.height`.

```js
window.addEventListener('message', function (event) {
    if (event.origin !== EXPECTED_ORIGIN) return;   // origine vérifiée
    var height = event.data && event.data.borealHeight;
    if (typeof height === 'number') document.getElementById(...).style.height = height + 'px';
});
```

Le filtre par origine n'est pas optionnel : sans lui, n'importe quelle page
peut redimensionner l'iframe. Côté Next.js, un `?embed=1` ferait masquer
l'en-tête et les pieds de page internes pour que la hauteur reste stable.

**c. L'Elementor**

Le shortcode est utilisable tel quel dans un widget « Shortcode ». Pour aller
plus loin, un widget Elementor enregistré via
`elementor/widgets/register` donnerait au client deux champs (URL et hauteur
par défaut) dans l'éditeur visuel au lieu d'une saisie de shortcode en
minuscules.

**d. Ce que je n'aurais pas fait**

Recommencer l'estimateur en PHP pour WordPress. Une seule implémentation, en
React, déployée une fois, avec WordPress comme simple coquille : pas de
divergence entre les deux versions, pas de duplication des règles de calcul,
pas de formulaire à maintenir deux fois. Le coût est la dépendance au
`postMessage` pour la hauteur — acceptable, et c'est la solution que
demandait l'énoncé.

### Vérification

```bash
npm run lint && npm run build   # 0 erreur, 0 avertissement
```

Parcours testé manuellement : soumission nominale (webhook 200 → `201`),
webhook non configuré (`502` + message utile), webhook qui répond 500
(`502`, lead conservé avec statut `Échec`), JSON invalide (`400`), superficie
hors bornes et courriel malformé (`422` avec erreurs par champ), limite de
débit (`429`), et filtre `/admin/leads?type=reparation`.

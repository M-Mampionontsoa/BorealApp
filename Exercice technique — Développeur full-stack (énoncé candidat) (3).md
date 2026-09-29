# **Exercice technique pour le poste de développeur Full-Stack** 

**Durée de lʼexercice:** 30 à 90 minutes 

**Intelligence artificielle :** Permis et encouragé. 

**Instructions:** Vous devez vous enregistrer en vidéo durant le processus. 

## **Le contexte** 

Notre client fictif, **Toitures Boréal** , est un couvreur de la Rive-Nord. Son site principal roule sous WordPress. Il veut un **estimateur de soumission en ligne** : le visiteur répond à quelques questions, obtient une estimation de prix instantanée, puis laisse ses coordonnées. Le lead doit ensuite être envoyé automatiquement vers le CRM de l'entreprise. 

Ton mandat : construire cet outil en React, le déployer, et démontrer comment il s'intègre à l'écosystème WordPress du client. 

## **Comment ça fonctionne** 

L'exercice est découpé en **3 niveaux** . Le niveau 1 est obligatoire. Avance aussi loin que possible dans le temps alloué : on ne s'attend pas à ce que tout le monde termine les trois niveaux. **Un niveau 1 propre et fonctionnel vaut mieux que trois niveaux bâclés.** Arrête-toi à 90 minutes maximum, même si ce n'est pas terminé. Note simplement dans le README ce que tu aurais fait ensuite. 

## **Stack imposée** 

   - **Next.js** App Router) + **TypeScript** 

   - **Tailwind CSS** + **shadcn/ui** 

   - Déploiement sur **Vercel** 

- Code sur un dépôt **GitHub** public (ou privé partagé avec nous) 

- Le reste (librairies de formulaire, validation, stockage) est à ta discrétion. 

## **Niveau 1 L'estimateur (obligatoire)** 

Crée un formulaire multi-étapes avec les étapes suivantes. 

#### **Étape 1 — Le projet** 

- Type de projet : Remplacement complet / Réparation / Nouvelle construction 

- Matériau : Bardeaux d'asphalte / Tôle / Membrane élastomère 

- Superficie en pieds carrés (entre 300 et 10 000 

- Pente du toit : Faible / Moyenne / Forte 

- Option « Démolition de l'ancien toit » (disponible **seulement** pour un remplacement complet) 

#### **Étape 2 — L'estimation** 

- Affiche le sous-total estimé, une fourchette de prix 10 %, la TPS, la TVQ et le total taxes incluses. 

- L'estimation doit se recalculer instantanément si l'utilisateur revient modifier l'étape 

#### **Étape 3 — Les coordonnées** 

- Nom complet, courriel, téléphone, ville, message (facultatif) 

- Validation côté client avec messages d'erreur clairs en français 

**Écran de confirmation** une fois le formulaire soumis. 

### **Règles de calcul** 

|Matériau|Taux|
|---|---|
|Bardeaux d'asphalte|6,50 $/pi²|
|Tôle|11,00 $/pi²|
|Membrane élastomère|9,00 $/pi²|



|Pente|Multiplicateur|
|---|---|
|Faible|× 1,00|
|Moyenne|× 1,15|
|Forte|× 1,35|



|Type de projet|Facteur|
|---|---|
|Remplacement complet|× 1,00|
|Réparation|× 0,35|
|Nouvelle construction|× 0,90|



#### **Formule :** 

base       = superficie × taux du matériau × multiplicateur de pente démolition = superficie × 1,75 $   (si cochée et projet = remplacement complet, sinon 0 sous-total = (base + démolition) × facteur du type de projet sous-total minimum = 750 $ fourchette = sous-total × 0,90  à  sous-total × 1,10 TPS = 5 % du sous-total  |  TVQ = 9,975 % du sous-total Les montants sont arrondis au cent et affichés au format québécois (ex. : 13 837,50 $. 

### **Exigences** 

- Interface responsive (mobile d'abord) construite avec les composants shadcn/ui 

- La logique de calcul est isolée dans une fonction pure, séparée des composants 

- L'application est déployée sur Vercel avec une URL publique 

## **Niveau 2 L'API et le CRM** 

1. Crée une **route API** POST /api/leads) qui reçoit la soumission. 

2. **Revalide les données côté serveur** et **recalcule l'estimation côté serveur** (ne fais pas confiance au montant envoyé par le navigateur). 

3. Transmets le lead en JSON à un **webhook externe** qui simule le CRM (ex. : une URL générée sur <u>webhook.site). L'URL doit être configurée via une variable</u> d'environnement. 

4. Gère les erreurs proprement : si le webhook échoue, l'utilisateur doit voir un message utile, pas un écran blanc. 

5. Crée une page /admin/leads qui liste les leads reçus dans un tableau shadcn (stockage de ton choix : en mémoire, fichier, Vercel KV, Supabase, etc.). Ajoute un filtre par type de projet. 

## **Niveau 3 L'intégration WordPress** 

1. Crée une page /realisations qui affiche les **5 derniers articles** d'un site WordPress via l'API REST (/wp-json/wp/v2/posts). Utilise https://wordpress.org/news/wp-json/wp/v2/posts si on ne t'a pas fourni d'autre site. Affiche le titre, la date, l'extrait (nettoyé du HTML et un lien vers l'article. Les données doivent être mises en cache et revalidées périodiquement. 

2. Le client veut afficher l'estimateur **dans une page de son site WordPress Elementor)** . Propose et implémente une solution : par exemple un mini-plugin WordPress qui ajoute un shortcode [boreal_estimateur], avec un iframe dont la hauteur s'ajuste automatiquement au contenu. Place le code du plugin dans un dossier /wordpress-plugin du dépôt. 

## **Ce qu'on te demande de remettre** 

1. Le lien du dépôt GitHub 

2. Lʼenregistrement vidéo 

3. L'URL Vercel de l'application déployée 


# 🎨 QuickSketch

Project of the **Web Technologies** course at **University of Naples Federico II** (A.A. 2025/2026).

![Node.js](https://img.shields.io/badge/Node.js-LTS-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-22-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Sequelize_ORM-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![Swagger](https://img.shields.io/badge/OpenAPI_3.1-Swagger_UI-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)
![Playwright](https://img.shields.io/badge/Playwright-E2E_Tested-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)

**QuickSketch** è un'applicazione web full-stack ispirata a *Pictionary*, in cui gli utenti possono sfidarsi disegnando una parola segreta in **60 secondi** o mettendo alla prova il proprio intuito per indovinare gli sketch della community entro un massimo di **10 tentativi**.

Progettata seguendo i principi dell'Ingegneria del Software (**Separation of Concerns**, **Single Responsibility Principle**, **RESTful Statelessness**, **Defense in Depth**), la piattaforma è composta da:

- **Backend** (`back-end/`) — REST API stateless sviluppata con **Node.js**, **Express 5**, **Sequelize ORM**, **SQLite** e documentata secondo lo standard **OpenAPI 3.1 (Swagger UI)**.
- **Frontend** (`front-end/`) — Single Page Application (SPA) reattiva basata su **Angular 22** (Standalone Components & Signals), **Tailwind CSS 4**, **SCSS** e **HTML5 Canvas** (`signature_pad` + algoritmo nativo Scanline Flood-Fill).
- **E2E Tests** (`front-end/tests/`) — Suite automatizzata di 10 test End-to-End isolati scritta con **Playwright** (Desktop & Mobile).

---

## 🏗️ Architettura del Sistema

Il sistema adotta una moderna architettura **Client-Server disaccoppiata**. La logica di business, la sicurezza anti-cheat (oscuramento server-side della parola segreta), la validazione dei tentativi e la persistenza risiedono nel Back-End, mentre l'esperienza utente, il tavolo da disegno interattivo e la reattività risiedono nella SPA Angular.

La comunicazione avviene esclusivamente tramite **API RESTful stateless** in formato JSON su protocollo HTTP, autenticate mediante **JWT (JSON Web Token)** e protette da politiche **CORS** e meccanismi **Anti-Bruteforce**.

### 🌐 Il Front-End (`front-end/`)
Sviluppata con **Angular 22**, l'interfaccia adotta un approccio *Mobile-First* scuro, fluido e privo di ricaricamenti di pagina. Tutte le rotte sono caricate in *Lazy Loading* (`loadComponent`) e lo stato applicativo è governato in modo reattivo tramite **Angular Signals**.

```text
front-end/
├── playwright.config.ts                # Configurazione multi-viewport e auto-start dei server
├── tests/
│   └── quicksketch.spec.ts             # Suite di 10 Test End-to-End isolati (Playwright)
└── src/app/
    ├── config/
    │   └── api.config.ts               # Centralizzazione degli endpoint REST
    ├── models/
    │   └── api.models.ts               # Interfacce e contratti TypeScript
    ├── guards/
    │   ├── auth.guard.ts               # Protezione rotte autenticate (/draw, /profile)
    │   └── pending-drawing/            # CanDeactivate Guard contro la perdita accidentale del disegno
    ├── interceptors/
    │   └── auth.interceptor.ts         # Iniezione automatica dell'header Authorization: Bearer <JWT>
    ├── services/                       # Logica di comunicazione HTTP (SRP: 1 Service per dominio)
    │   ├── auth/                       # Gestione sessione utente, JWT e stato del modale Auth
    │   ├── sketch/                     # CRUD Sketch e invio tentativi (Attempts)
    │   ├── word/                       # Estrazione parole casuali e gestione dizionario Admin
    │   ├── stats/                      # Recupero classifiche globali e metriche personali
    │   └── toast/                      # Sistema di notifiche push in-app non bloccanti
    ├── components/
    │   ├── auth-modal/                 # Modale Login/Signup con Password Strength Meter semaforico
    │   └── shared/                     # Componenti UI riutilizzabili (Navbar, Modal, Skeleton, EmptyState)
    └── pages/
        ├── gallery/                    # Esplorazione pubblica, filtri reattivi per categoria/stato/autore
        ├── draw/                       # Lavagna Canvas a 60s (Pennello, Secchiello Flood-Fill, Gomma, Undo/Redo)
        ├── play-sketch/                # Arena dei 10 tentativi con indizio "Fuochino" e svelamento soluzione
        ├── leaderboards/               # Doppia classifica (Migliori Giocatori e Migliori Disegnatori)
        └── profile/                    # Dashboard statistiche personali e Pannello Dizionario Admin
```

### ⚙️ Il Back-End (`back-end/`)
Il server **Express 5** è strutturato secondo il pattern architetturale **Router – Controller – Model – Middleware**, garantendo modularità e manutenibilità.

```text
back-end/
├── index.js                            # Entry point: configurazione middleware, Swagger e bootstrap DB
├── .env.example                        # Template delle variabili d'ambiente
├── controllers/                        # Logica di business e regole di dominio
│   ├── AuthController.js               # Signup/Login, hashing BCrypt, emissione/verifica JWT
│   ├── SketchController.js             # Creazione, filtri, RBAC delete e sanitizzazione Anti-Cheat della parola
│   ├── AttemptController.js            # Gestione dei 10 tentativi e calcolo Distanza di Levenshtein ("Fuochino")
│   ├── WordController.js               # Estrazione randomica bilanciata e CRUD dizionario (Admin)
│   └── StatsController.js              # Calcolo statistiche utente e classifiche globali
├── middleware/
│   ├── authMiddleware.js               # enforceAuthentication, enforceAdmin e optionalAuthentication
│   ├── rateLimitMiddleware.js          # Scudo Anti-Bruteforce con backoff esponenziale (HTTP 429)
│   └── errorMiddleware.js              # Gestione centralizzata errori HTTP, JSON malformati e Sequelize
├── models/
│   ├── Database.js                     # Istanza Sequelize e definizione relazioni (User, Sketch, Attempt, Word)
│   └── data/                           # Schemi delle tabelle e indici di performance
├── routes/                             # Definizione endpoint REST e annotazioni OpenAPI (@swagger)
│   ├── authRouter.js                   # /api/auth (signup, login)
│   ├── sketchRouter.js                 # /api/sketches (CRUD e /:id/attempts)
│   ├── wordRouter.js                   # /api/words (random e gestione Admin)
│   └── statsRouter.js                  # /api/stats (leaderboards, me, users/:id)
└── utils/
    ├── HttpError.js                    # Classe custom per la tipizzazione degli errori HTTP
    ├── seedDatabase.js                 # Seeding automatico dell'utente Admin e del pool iniziale di parole
    └── swagger.js                      # Generazione specifica OpenAPI 3.1
```

---

## ⚡ Flusso di Gioco e Scelte Ingegneristiche

1. **Autenticazione & Sicurezza (RBAC + Anti-Bruteforce):** Le password sono sottoposte a validazione di complessità e salvate tramite hashing **BCrypt**. Gli endpoint `/api/auth` sono protetti da un middleware anti-bruteforce che blocca i tentativi ripetuti restituendo `429 Too Many Requests` con header `Retry-After` e countdown visivo nel client.
2. **Creazione Sketch in 60 Secondi:** L'utente autenticato estrae 3 parole casuali dal pool del server (`GET /api/words/random`), ne sceglie una e avvia il countdown di 60 secondi. La lavagna combina i tratti vettoriali fluidi di `signature_pad` con un algoritmo **Scanline Flood-Fill** su array tipizzati (`Uint32Array`) per il riempimento immediato delle aree chiuse, supportando **Undo/Redo** unificati (`Ctrl+Z` / `Ctrl+Y`).
3. **Protezione Anti-Cheat Server-Side:** Il metodo `SketchController.formatSketchForUser` rimuove la parola segreta (`word: null`) dal payload JSON destinato ai visitatori o ai giocatori con partita ancora aperta, esponendo unicamente la lunghezza (`wordLength`). La parola viene rivelata dal server solo all'autore del disegno o a partita conclusa (`WON` o `LOST`).
4. **Arena dei 10 Tentativi e Distanza di Levenshtein:** Ogni giocatore dispone di 10 tentativi per ciascuno sketch altrui (vincolo di integrità `UNIQUE(playerId, sketchId)`). In caso di errore, il backend calcola in tempo $O(N \cdot M)$ la **Distanza di Levenshtein** tra il tentativo e la soluzione: se la distanza è $\le 1$ (parole corte) o $\le 2$ (parole da 5+ lettere), fornisce l'indizio *"🔥 Fuochino! Ci sei andato molto vicino!"*.

---

## 📋 Prerequisites

Assicurati di avere installato sulla tua macchina i seguenti strumenti:

| Tool | Version | Notes |
| :--- | :--- | :--- |
| **Node.js** | `>= 20 (LTS)` | Richiesto sia dal `back-end` che dal `front-end` |
| **npm** | `>= 10` | Incluso nell'installazione di Node.js |
| **Git** | `>= 2.x` | Per clonare il repository |

Verifica le versioni installate con:

```bash
node -v
npm -v
git --version
```

> **Nota sul Database:** Non è richiesta l'installazione di alcun server database esterno. Il backend utilizza **SQLite** tramite **Sequelize ORM**: il database locale (`database.db`), le tabelle, l'utente amministratore e il pool iniziale di parole vengono **creati e popolati automaticamente** al primo avvio del server (`initDatabase()` in `back-end/models/Database.js`).

---

## 🛠️ Setup e Installazione (Ambiente Locale)

### 1. Clona il repository e imposta il terminale sulla cartella iniziale

```bash
git clone https://github.com/Kirby191/QuickSketch.git (Opzionale)
cd QuickSketch
```

---

### 2. Backend setup (`back-end/`)

#### 2.1 Installa le dipendenze

```bash
cd back-end
npm install
```

#### 2.2 Configura le variabili d'ambiente

Copia il file di esempio fornito nella cartella `back-end/` per creare il tuo file `.env`:

```bash
cp .env.example .env
```

Contenuto di `back-end/.env`:

```ini
PORT=3000
FRONTEND_URL="http://localhost:4200"
DB_CONNECTION_URI="sqlite:database.db"
JWT_SECRET="INSERISCI_QUI_UNA_CHIAVE_SEGRETA_CASUALE"
JWT_EXPIRATION="24h"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin123"
```

| Variabile | Descrizione |
| :--- | :--- |
| `PORT` | Porta su cui si mette in ascolto il server Express (default: `3000`) |
| `FRONTEND_URL` | Origine autorizzata dal middleware CORS (il dev server Angular) |
| `DB_CONNECTION_URI` | Stringa di connessione Sequelize (default: `sqlite:database.db`) |
| `JWT_SECRET` | Chiave segreta usata per firmare e verificare i token JWT |
| `JWT_EXPIRATION` | Durata di validità del token JWT (es. `24h`) |
| `ADMIN_USERNAME` | Username dell'account Amministratore creato al primo avvio |
| `ADMIN_PASSWORD` | Password dell'account Amministratore creato al primo avvio |

#### 2.3 Avvia il backend

```bash
npm start
```

Il server sarà attivo su **`http://localhost:3000`**.
È disponibile la documentazione interattiva **Swagger UI (OpenAPI 3.1)** all'indirizzo **`http://localhost:3000/api-docs`**, utile per esplorare gli schemi REST e testare direttamente le operazioni CRUD.

---

### 3. Frontend setup (`front-end/`)

Apri un **nuovo terminale** (lasciando il backend in esecuzione) partendo dalla radice del progetto.

#### 3.1 Installa le dipendenze

```bash
cd front-end
npm install
```

#### 3.2 Avvia il frontend

```bash
npm start
```

Il comando avvia il dev server di Angular. Apri il browser all'indirizzo **`http://localhost:4200`**.

> Il frontend comunica di default con il backend su `http://localhost:3000/api` (configurato in `front-end/src/app/config/api.config.ts`).

---

### 4. End-to-End Tests (`Playwright`)

Il progetto include una suite di **10 test End-to-End isolati** (in `front-end/tests/quicksketch.spec.ts`) che verificano l'intero sistema su viewport Desktop (`Desktop Chrome`) e Mobile (`Galaxy S20`).

#### 4.1 Installa i browser di Playwright

Dalla cartella `front-end/`, scarica i binari dei browser richiesti da Playwright (operazione necessaria solo la prima volta):

```bash
cd front-end
npx playwright install
```

#### 4.2 Esegui i test E2E

```bash
npx playwright test
```

Playwright è configurato (vedi `front-end/playwright.config.ts`) per **avviare automaticamente sia il backend (`:3000`) che il frontend (`:4200`)** prima di eseguire i test qualora non fossero già accesi.

Per visualizzare il report HTML interattivo al termine dell'esecuzione:

```bash
npx playwright show-report
```

---

## 👨‍💻 Autore

Progetto realizzato nell'ambito dell'insegnamento di **Web Technologies (Tecnologie Web)** (A.A. 2025/2026) presso l'**Università degli Studi di Napoli Federico II**.

- **Sviluppatore Software:** Vittorio Emanuele Testa

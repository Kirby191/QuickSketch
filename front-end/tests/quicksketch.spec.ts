import { test, expect, Page, APIRequestContext } from '@playwright/test';

const API_BASE = 'http://localhost:3000/api';
const VALID_PASS = 'Sketch2026!';

// Immagine PNG 1x1 valida in Base64 per il seeding rapido via REST API nei test isolati
const SAMPLE_PNG_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

/**
 * Helper UI: Registra un nuovo utente tramite il modale della Single Page Application
 */
async function registerUserViaModal(page: Page, username: string, password = VALID_PASS) {
  await page.goto('/');
  await page.getByTestId('nav-signup-btn').click();
  await expect(page.getByTestId('modal-container')).toBeVisible();

  await page.getByTestId('auth-username-input').fill(username);
  await page.getByTestId('auth-password-input').fill(password);
  await page.getByTestId('auth-confirm-password-input').fill(password);
  await page.getByTestId('auth-submit-btn').click();

  await expect(page.getByTestId('nav-username')).toHaveText(username);
}

/**
 * Helper API per garantire l'Isolamento dei Test (E2E Test Isolation):
 * Crea un utente e pubblica uno sketch direttamente via REST API, restituendo l'ID e la parola segreta.
 */
async function seedSketchViaApi(request: APIRequestContext, suffix: string) {
  const username = `seed_artist_${Date.now()}_${suffix}`;
  const signupRes = await request.post(`${API_BASE}/auth/signup`, {
    data: { username, password: VALID_PASS },
  });
  expect(signupRes.ok()).toBeTruthy();
  const { token } = await signupRes.json();

  const wordsRes = await request.get(`${API_BASE}/words/random?count=3`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const words = await wordsRes.json();
  const chosenWord: string = words[0].text;

  const sketchRes = await request.post(`${API_BASE}/sketches`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      word: chosenWord,
      imageData: SAMPLE_PNG_BASE64,
      drawingTime: 25,
    },
  });
  expect(sketchRes.ok()).toBeTruthy();
  const createdSketch = await sketchRes.json();

  return {
    artistUsername: username,
    artistToken: token,
    sketchId: createdSketch.id as number,
    secretWord: chosenWord.toLowerCase(),
  };
}

test.describe('QuickSketch Full-Stack End-to-End Suite (10 Isolated Tests)', () => {

  // TEST 1: Esplorazione pubblica Ospite e filtri categoria
  test('1. Ospite non registrato esplora la galleria e filtra per categoria senza vedere le parole segrete', async ({ page, request }) => {
    const seeded = await seedSketchViaApi(request, 't1');

    await page.goto('/');
    await expect(page.getByTestId('nav-logo')).toContainText('QuickSketch');
    await expect(page.getByTestId('nav-login-btn')).toBeVisible();

    // Verifica che la parola segreta NON sia mai esposta nella card per un visitatore ospite
    const sketchCard = page.getByTestId(`sketch-card-${seeded.sketchId}`);
    await expect(sketchCard).toBeVisible();
    await expect(page.getByTestId(`sketch-revealed-word-${seeded.sketchId}`)).toHaveCount(0);

    // Verifica funzionamento filtro categorie
    const animalFilter = page.getByTestId('filter-category-animali');
    await animalFilter.click();
    await expect(animalFilter).toHaveClass(/bg-indigo-600/);
  });

  // TEST 2: Validazione Client-Side Password (Barra Rossa -> Arancione -> Verde + Checklist)
  test('2. Il modale di registrazione valida in tempo reale la complessità della password con barra semaforica', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-signup-btn').click();

    const pwdInput = page.getByTestId('auth-password-input');
    const confirmInput = page.getByTestId('auth-confirm-password-input');
    const submitBtn = page.getByTestId('auth-submit-btn');
    const strengthLabel = page.getByTestId('password-strength-label');

    await page.getByTestId('auth-username-input').fill('utente_test_pwd');

    // 1. Password debole (Rossa) -> Checklist incompleta e bottone disabilitato
    await pwdInput.fill('abc');
    await confirmInput.fill('abc');
    await expect(strengthLabel).toContainText('Poco sicura');
    await expect(page.getByTestId('pwd-req-length')).toContainText('✕');
    await expect(submitBtn).toBeDisabled();

    // 2. Password media senza carattere speciale (Arancione) -> Bottone ancora disabilitato
    await pwdInput.fill('Abcdef12');
    await confirmInput.fill('Abcdef12');
    await expect(strengthLabel).toContainText('Sicurezza media');
    await expect(page.getByTestId('pwd-req-uppercase')).toContainText('✓');
    await expect(page.getByTestId('pwd-req-special')).toContainText('✕');
    await expect(submitBtn).toBeDisabled();

    // 3. Password forte con >=6 char, Maiuscola e Speciale (Verde) -> Bottone abilitato
    await pwdInput.fill(VALID_PASS);
    await confirmInput.fill(VALID_PASS);
    await expect(strengthLabel).toContainText('Ottima password sicura');
    await expect(page.getByTestId('pwd-req-special')).toContainText('✓');
    await expect(submitBtn).toBeEnabled();
  });

  // TEST 3: Registrazione Utente, Toast di Benvenuto e Persistenza Sessione JWT
  test('3. La registrazione di un nuovo utente mostra il Toast di conferma e aggiorna la Navbar', async ({ page }) => {
    const newUsername = `user_t3_${Date.now()}`;
    await registerUserViaModal(page, newUsername);

    await expect(page.getByTestId('toast-notification').first()).toContainText(newUsername);
    await expect(page.getByTestId('nav-draw-link')).toBeVisible();
    await expect(page.getByTestId('nav-profile-link')).toBeVisible();
  });

  // TEST 4: Protezione Route Guard (authGuard) su /draw e Redirect Post-Login
  test('4. Un ospite che naviga su /draw viene intercettato dalla Guard e portato alla lavagna subito dopo il login', async ({ page }) => {
    const userT4 = `user_t4_${Date.now()}`;

    await page.goto('/draw');
    // La guard reindirizza a '/' e apre automaticamente il modale di autenticazione
    await expect(page).toHaveURL('http://localhost:4200/');
    await expect(page.getByTestId('modal-container')).toBeVisible();

    // L'utente passa al tab Registrati e completa l'accesso: viene reindirizzato automaticamente a /draw!
    await page.getByTestId('auth-tab-signup').click();
    await page.getByTestId('auth-username-input').fill(userT4);
    await page.getByTestId('auth-password-input').fill(VALID_PASS);
    await page.getByTestId('auth-confirm-password-input').fill(VALID_PASS);
    await page.getByTestId('auth-submit-btn').click();

    await expect(page).toHaveURL(/\/draw$/);
  });

  // TEST 5: Flusso Disegno Completo (Pennello, Scomparsa immediata Hint, Secchiello Flood-Fill, Undo/Redo e Pubblicazione)
  test('5. Il disegnatore usa Pennello, Secchiello Flood-Fill e Undo/Redo prima di pubblicare lo sketch', async ({ page }) => {
    const artistT5 = `artist_t5_${Date.now()}`;
    await registerUserViaModal(page, artistT5);

    await page.getByTestId('nav-draw-link').click();
    await expect(page).toHaveURL(/\/draw$/);

    // 1. Verifica estrazione di 3 parole casuali e seleziona la prima
    const wordCards = page.locator('[data-testid^="word-choice-card-"]');
    await expect(wordCards).toHaveCount(3);
    await wordCards.first().click();

    const canvas = page.getByTestId('drawing-canvas');
    await expect(canvas).toHaveClass(/tool-pen/);
    await expect(page.getByTestId('canvas-empty-hint')).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    // 2. Appoggia il puntatore sulla tela: l'hint centrale deve sparire ISTANTANEAMENTE al pointerdown!
    await page.mouse.move(box!.x + 80, box!.y + 80);
    await page.mouse.down();
    await expect(page.getByTestId('canvas-empty-hint')).toBeHidden();

    // Traccia una linea con il Pennello e rilascia il mouse (Azione #1)
    await page.mouse.move(box!.x + 200, box!.y + 150, { steps: 5 });
    await page.mouse.up();
    await expect(page.getByTestId('strokes-counter')).toHaveText('1');

    // 3. Attiva lo strumento Secchiello (Flood-Fill) e verifica il cambio del cursore (.tool-bucket)
    await page.getByTestId('canvas-fill-btn').click();
    await expect(canvas).toHaveClass(/tool-bucket/);

    // Clicca dentro la tela con il Secchiello per eseguire lo Scanline Flood-Fill (Azione #2)
    await page.mouse.click(box!.x + 40, box!.y + 40);
    await expect(page.getByTestId('strokes-counter')).toHaveText('2');

    // 4. Verifica lo stack unificato di Undo e Redo
    await page.getByTestId('canvas-undo-btn').click();
    await expect(page.getByTestId('strokes-counter')).toHaveText('1');

    await page.getByTestId('canvas-redo-btn').click();
    await expect(page.getByTestId('strokes-counter')).toHaveText('2');

    // 5. Pubblica lo sketch e verifica il redirect alla pagina di dettaglio
    await page.getByTestId('publish-sketch-btn').click();
    await expect(page).toHaveURL(/\/sketches\/\d+$/);
  });

  // TEST 6: Regola Anti-Cheat Autore (Isolato)
  test('6. L\’autore dello sketch visualizza la propria parola segreta ma non può inviare tentativi sul proprio disegno', async ({ page, request }) => {
    const seeded = await seedSketchViaApi(request, 't6');

    await page.goto('/');
    await page.getByTestId('nav-login-btn').click();
    await page.getByTestId('auth-username-input').fill(seeded.artistUsername);
    await page.getByTestId('auth-password-input').fill(VALID_PASS);
    await page.getByTestId('auth-submit-btn').click();
    await expect(page.getByTestId('nav-username')).toHaveText(seeded.artistUsername);

    await page.goto(`/sketches/${seeded.sketchId}`);
    await expect(page.getByTestId('author-info-box')).toBeVisible();
    await expect(page.getByTestId('guess-input')).toHaveCount(0);
  });

  // TEST 7: Suggerimento "🔥 Fuochino! Ci sei andato vicino!" (Levenshtein) e Blocco Duplicati (Isolato)
  test('7. Il giocatore riceve il suggerimento "Fuochino / vicino" per parole simili e non spreca tentativi sui duplicati', async ({ page, request }) => {
    const seeded = await seedSketchViaApi(request, 't7');
    const playerUser = `player_t7_${Date.now()}`;

    await registerUserViaModal(page, playerUser);
    await page.goto(`/sketches/${seeded.sketchId}`);

    const guessInput = page.getByTestId('guess-input');
    const submitBtn = page.getByTestId('submit-guess-btn');

    // Modifica 1 sola lettera della parola segreta per avere Distanza di Levenshtein = 1
    const lastChar = seeded.secretWord.slice(-1) === 'a' ? 'o' : 'a';
    const closeWord = seeded.secretWord.slice(0, -1) + lastChar;

    await guessInput.fill(closeWord);
    await submitBtn.click();

    // Verifica il banner "vicino" e il badge nello storico tentativi
    await expect(page.getByTestId('guess-feedback-banner')).toContainText('vicino');
    await expect(page.getByTestId('attempts-counter')).toContainText('1 / 10');
    await expect(page.getByTestId('guessed-words-history')).toContainText('Vicino!');

    // Riscrivendo la stessa parola, la validazione client-side disabilita il bottone d'invio
    await guessInput.fill(closeWord);
    await expect(page.getByTestId('guess-client-hint')).toContainText('Hai già provato');
    await expect(submitBtn).toBeDisabled();
  });

  // TEST 8: Vittoria del Giocatore (WON) e Svelamento Parola Segreta nel Modale (Isolato)
  test('8. Il giocatore indovina la parola segreta, apre il modale di vittoria e sblocca le caselle della soluzione', async ({ page, request }) => {
    const seeded = await seedSketchViaApi(request, 't8');
    const winnerUser = `winner_t8_${Date.now()}`;

    await registerUserViaModal(page, winnerUser);
    await page.goto(`/sketches/${seeded.sketchId}`);

    await page.getByTestId('guess-input').fill(seeded.secretWord);
    await page.getByTestId('submit-guess-btn').click();

    await expect(page.getByTestId('modal-solution-word')).toHaveText(
      new RegExp(seeded.secretWord, 'i')
    );
  });

  // TEST 9: Aggiornamento Statistiche Personali (/profile) e Classifiche (/leaderboards) (Isolato)
  test('9. Le statistiche personali e le due classifiche mostrano correttamente i dati aggiornati', async ({ page, request }) => {
    const seeded = await seedSketchViaApi(request, 't9');
    const statsPlayer = `stats_p_${Date.now()}`;

    await registerUserViaModal(page, statsPlayer);
    await page.goto(`/sketches/${seeded.sketchId}`);
    await page.getByTestId('guess-input').fill(seeded.secretWord);
    await page.getByTestId('submit-guess-btn').click();
    await page.getByTestId('modal-close-btn').click();

    // Verifica Statistiche Personali (/profile)
    await page.getByTestId('nav-profile-link').click();
    await expect(page.getByTestId('stat-card-words-guessed')).toContainText('1');
    await expect(page.getByTestId('stat-card-attempts-used')).toContainText('1');
    await expect(page.getByTestId('recent-games-list')).toContainText(seeded.secretWord);

    // Verifica Classifiche (/leaderboards)
    await page.getByTestId('nav-leaderboards-link').click();
    await expect(page.getByTestId('leaderboard-players-table')).toContainText(statsPlayer);

    await page.getByTestId('leaderboard-tab-artists').click();
    await expect(page.getByTestId('leaderboard-artists-table')).toContainText(seeded.artistUsername);
  });

  // TEST 10: Protezione Anti-Bruteforce (Punishment HTTP 429) e Responsività Mobile
  test('10. Il sistema Anti-Bruteforce blocca l’utente con countdown dopo 5 login errati su viewport Mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const mobileToggle = page.getByTestId('nav-mobile-toggle');
    await expect(mobileToggle).toBeVisible();
    await mobileToggle.click();
    await expect(page.getByTestId('nav-mobile-drawer')).toBeVisible();

    await page.getByTestId('nav-mobile-drawer').getByText('Accedi').click();

    const usrInput = page.getByTestId('auth-username-input');
    const pwdInput = page.getByTestId('auth-password-input');
    const submitBtn = page.getByTestId('auth-submit-btn');

    await usrInput.fill(`bruteforce_target_${Date.now()}`);

    for (let i = 1; i <= 5; i++) {
      await pwdInput.fill(`WrongPass${i}!`);
      await submitBtn.click();
      await expect(page.getByTestId('auth-error-banner')).toBeVisible();
    }

    // Al 6° tentativo scatta lo scudo 429 Too Many Requests con timer di blocco sul bottone
    await pwdInput.fill('WrongPass6!');
    await submitBtn.click();
    await expect(page.getByTestId('auth-error-banner')).toContainText('anti-bruteforce');
    await expect(submitBtn).toBeDisabled();
    await expect(submitBtn).toContainText('Blocco sicurezza');
  });
});
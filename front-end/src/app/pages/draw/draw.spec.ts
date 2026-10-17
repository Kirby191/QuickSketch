import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ElementRef, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SketchService } from '../../services/sketch/sketch.service';
import { ToastService } from '../../services/toast/toast.service';
import { WordService } from '../../services/word/word.service';
import { DrawComponent } from './draw';

// Verifica selezione della parola, strumenti canvas e pubblicazione del disegno.
describe('DrawComponent', () => {
  let fixture: ComponentFixture<DrawComponent>;
  let component: DrawComponent;
  let words: Record<string, ReturnType<typeof vi.fn>>;
  let sketches: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    words = { getRandomWords: vi.fn(() => of([{ id: 1, text: 'gatto', category: 'Animali', difficulty: 'EASY' }])) };
    sketches = { createSketch: vi.fn(() => of({ id: 4 })) };
    await TestBed.configureTestingModule({
      imports: [DrawComponent],
      providers: [
        { provide: WordService, useValue: words },
        { provide: SketchService, useValue: sketches },
        ToastService,
        provideRouter([]),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DrawComponent);
    component = fixture.componentInstance;
    component.ngOnInit();
  });

  // L'apertura della pagina carica le parole e prepara lo stato iniziale.
  it('loads words and exposes initial drawing state', () => {
    expect(component.wordOptions()[0].text).toBe('gatto');
    expect(component.phase()).toBe('SELECT_WORD');
    expect(component.timeProgressPercent()).toBe(100);
    expect(component.showCanvasHint()).toBe(true);
    expect(component.canPublish()).toBe(false);
  });

  // La scelta di una parola azzera lo storico e avvia una nuova sessione di disegno.
  it('resets drawing state when a word is selected', () => {
    component.chooseWordAndStart(component.wordOptions()[0]);
    expect(component.phase()).toBe('DRAWING');
    expect(component.selectedWord()?.text).toBe('gatto');
    expect(component.activeTool()).toBe('PEN');
    expect(component.strokesCount()).toBe(0);
    component.ngOnDestroy();
  });

  // I comandi della toolbar aggiornano strumento, colore e dimensione del tratto.
  it('switches tools, colors and brush sizes', () => {
    component.toggleBucketTool();
    expect(component.isBucket()).toBe(true);
    component.toggleBucketTool();
    expect(component.isPen()).toBe(true);
    component.toggleEraser();
    expect(component.isEraser()).toBe(true);
    component.selectColor('#e11d48');
    expect(component.isPen()).toBe(true);
    component.selectBrushSize(2);
    expect(component.activeBrushIndex()).toBe(2);
  });

  // Le scorciatoie sono attive solo nel canvas e non interferiscono con gli input.
  it('handles keyboard shortcuts only while drawing and ignores form fields', () => {
    component.phase.set('DRAWING');
    component.onKeyDown(new KeyboardEvent('keydown', { key: 'e' }));
    expect(component.isEraser()).toBe(true);
    component.onKeyDown(new KeyboardEvent('keydown', { key: 'p', ctrlKey: true }));
    expect(component.isEraser()).toBe(true);
    const input = document.createElement('input');
    Object.defineProperty(input, 'tagName', { value: 'INPUT' });
    const inputEvent = new KeyboardEvent('keydown', { key: 'p', bubbles: true });
    Object.defineProperty(inputEvent, 'target', { value: input });
    component.onKeyDown(inputEvent);
    expect(component.isEraser()).toBe(true);
  });

  // Gli errori di caricamento sono esposti e le difficoltà ricevono l'etichetta corretta.
  it('reports word loading errors and difficulty labels', () => {
    words['getRandomWords'].mockReturnValue(throwError(() => ({ error: { description: 'offline' } })));
    component.fetchRandomWords();
    expect(component.errorMessage()).toBe('offline');
    expect(component.getDifficultyBadge('EASY').label).toBe('Facile');
    expect(component.getDifficultyBadge('HARD').label).toBe('Difficile');
    expect(component.getDifficultyBadge('MEDIUM').label).toBe('Media');
  });

  // La fase di selezione mostra le parole ma non ancora i controlli del disegno.
  it('renders the word selection state and keyboard legend', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="word-choices-grid"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="keyboard-shortcuts-legend"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="refresh-words-btn"]')).toBeTruthy();
  });

  // Il template riflette la fase di disegno e inoltra i click alla toolbar.
  it('renders drawing controls and updates the tool through the template', () => {
    fixture.detectChanges();
    component.phase.set('DRAWING');
    component.selectedWord.set(component.wordOptions()[0]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="drawing-canvas"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="keyboard-shortcuts-legend"]')).toBeTruthy();
    fixture.nativeElement.querySelector('[data-testid="canvas-fill-btn"]').click();
    expect(component.isBucket()).toBe(true);
    fixture.nativeElement.querySelector('[data-testid="canvas-pen-btn"]').click();
    expect(component.isPen()).toBe(true);
  });

  // Un disegno valido viene inviato e apre il dettaglio dello sketch creato.
  it('publishes a completed drawing and navigates to its detail page', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const canvas = {
      toDataURL: vi.fn(() => 'data:image/png;base64,canvas'),
    } as unknown as HTMLCanvasElement;
    component.canvasRef = new ElementRef(canvas);
    component.selectedWord.set(component.wordOptions()[0]);
    component.phase.set('DRAWING');
    component.strokesCount.set(1);
    component.timeLeft.set(42);
    component.publishSketch();
    expect(sketches['createSketch']).toHaveBeenCalledWith('gatto', 'data:image/png;base64,canvas', 18);
    expect(router.navigate).toHaveBeenCalledWith(['/sketches', 4]);
  });

  // Un errore di pubblicazione mantiene il lavoro locale e informa l'utente.
  it('returns to drawing and reports publishing failures', () => {
    sketches['createSketch'].mockReturnValue(throwError(() => ({ error: { description: 'server error' } })));
    component.canvasRef = new ElementRef({ toDataURL: () => 'data:image/png;base64,canvas' } as HTMLCanvasElement);
    component.selectedWord.set(component.wordOptions()[0]);
    component.phase.set('DRAWING');
    component.strokesCount.set(1);
    component.publishSketch();
    expect(component.phase()).toBe('DRAWING');
    expect(component.errorMessage()).toBe('server error');
  });
});

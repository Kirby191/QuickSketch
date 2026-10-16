import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { Router } from '@angular/router';
import SignaturePad from 'signature_pad';
import { WordService } from '../../services/word/word.service';
import { SketchService } from '../../services/sketch/sketch.service';
import { WordItem } from '../../models/api.models';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state.component';

export type DrawPhase = 'SELECT_WORD' | 'DRAWING' | 'SUBMITTING';

@Component({
  selector: 'app-draw',
  standalone: true,
  imports: [EmptyStateComponent],
  templateUrl: './draw.html',
  styleUrl: './draw.scss',
})
export class DrawComponent implements OnInit, OnDestroy {
  private readonly wordService = inject(WordService);
  private readonly sketchService = inject(SketchService);
  private readonly router = inject(Router);

  @ViewChild('canvasEl') canvasRef?: ElementRef<HTMLCanvasElement>;

  private signaturePad: SignaturePad | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  readonly MAX_TIME = 60;

  // Palette colori e spessori pensati per disegnare rapidamente
  readonly colors = [
    { name: 'Nero', hex: '#0f172a' },
    { name: 'Indaco', hex: '#4f46e5' },
    { name: 'Rosso', hex: '#e11d48' },
    { name: 'Verde', hex: '#10b981' },
    { name: 'Ambra', hex: '#f59e0b' },
    { name: 'Azzurro', hex: '#0ea5e9' },
    { name: 'Viola', hex: '#9333ea' },
    { name: 'Marrone', hex: '#78350f' },
  ];

  readonly brushSizes = [
    { label: 'Fine', min: 1.5, max: 3.5, dotSize: 6 },
    { label: 'Medio', min: 3, max: 6, dotSize: 10 },
    { label: 'Spesso', min: 6, max: 11, dotSize: 15 },
  ];

  // Stato della macchina a stati
  readonly phase = signal<DrawPhase>('SELECT_WORD');
  readonly wordOptions = signal<WordItem[]>([]);
  readonly isLoadingWords = signal<boolean>(true);
  readonly selectedWord = signal<WordItem | null>(null);
  readonly errorMessage = signal<string | null>(null);

  // Stato Strumenti Canvas e Timer
  readonly timeLeft = signal<number>(this.MAX_TIME);
  readonly activeColor = signal<string>('#0f172a');
  readonly activeBrushIndex = signal<number>(1); // Medio di default
  readonly isEraser = signal<boolean>(false);
  readonly strokesCount = signal<number>(0);

  // Calcolo percentuale e colore barra del tempo
  readonly timeProgressPercent = computed(() =>
    Math.max(0, Math.round((this.timeLeft() / this.MAX_TIME) * 100))
  );
  readonly isTimeCritical = computed(() => this.timeLeft() <= 10);
  readonly canPublish = computed(
    () => this.strokesCount() > 0 && this.phase() === 'DRAWING'
  );

  ngOnInit(): void {
    this.fetchRandomWords();
  }

  // 1. Estrae 3 parole casuali dal Back-End
  fetchRandomWords(): void {
    this.stopTimer();
    this.cleanupCanvas();
    this.phase.set('SELECT_WORD');
    this.selectedWord.set(null);
    this.isLoadingWords.set(true);
    this.errorMessage.set(null);

    this.wordService.getRandomWords(3).subscribe({
      next: (words) => {
        this.wordOptions.set(words);
        this.isLoadingWords.set(false);
      },
      error: (err) => {
        this.isLoadingWords.set(false);
        this.errorMessage.set(
          err.error?.description ||
            'Impossibile estrarre le parole casuali dal server.'
        );
      },
    });
  }

  // 2. Seleziona la parola e avvia la sessione di disegno da 60 secondi
  chooseWordAndStart(word: WordItem): void {
    this.selectedWord.set(word);
    this.phase.set('DRAWING');
    this.timeLeft.set(this.MAX_TIME);
    this.strokesCount.set(0);
    this.errorMessage.set(null);

    // Attendiamo il rendering del DOM del blocco @if (phase() === 'DRAWING')
    setTimeout(() => {
      this.initSignaturePad();
      this.startTimer();
    }, 0);
  }

  // 3. Inizializza SignaturePad con supporto High-DPI e ResizeObserver
  private initSignaturePad(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const brush = this.brushSizes[this.activeBrushIndex()];

    this.signaturePad = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: this.activeColor(),
      minWidth: brush.min,
      maxWidth: brush.max,
    });

    // Aggiorna il contatore dei tratti alla fine di ogni segno disegnato
    this.signaturePad.addEventListener('endStroke', () => {
      if (this.signaturePad) {
        this.strokesCount.set(this.signaturePad.toData().length);
      }
    });

    this.resizeCanvasPreservingStrokes();

    // Osserva cambiamenti di dimensione della viewport (es. rotazione smartphone/tablet)
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeCanvasPreservingStrokes();
    });
    if (canvas.parentElement) {
      this.resizeObserver.observe(canvas.parentElement);
    }
  }

  private resizeCanvasPreservingStrokes(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.signaturePad) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Salva i tratti vettoriali prima di ridimensionare il buffer bitmap
    const savedData = this.signaturePad.toData();
    const ratio = Math.max(window.devicePixelRatio || 1, 1);

    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
    }

    this.signaturePad.clear();
    if (savedData.length > 0) {
      this.signaturePad.fromData(savedData);
    }
  }

  // 4. Gestione Strumenti di Disegno (Colore, Spessore, Gomma, Undo, Clear)
  selectColor(hex: string): void {
    this.isEraser.set(false);
    this.activeColor.set(hex);
    if (this.signaturePad) {
      this.signaturePad.penColor = hex;
      this.applyBrushSize(this.activeBrushIndex());
    }
  }

  selectBrushSize(index: number): void {
    this.activeBrushIndex.set(index);
    this.applyBrushSize(index);
  }

  private applyBrushSize(index: number): void {
    if (!this.signaturePad) return;
    const brush = this.brushSizes[index];
    const multiplier = this.isEraser() ? 2.2 : 1;
    this.signaturePad.minWidth = brush.min * multiplier;
    this.signaturePad.maxWidth = brush.max * multiplier;
  }

  toggleEraser(): void {
    const nextEraserState = !this.isEraser();
    this.isEraser.set(nextEraserState);
    if (this.signaturePad) {
      this.signaturePad.penColor = nextEraserState
        ? 'rgb(255, 255, 255)'
        : this.activeColor();
      this.applyBrushSize(this.activeBrushIndex());
    }
  }

  undoLastStroke(): void {
    if (!this.signaturePad) return;
    const data = this.signaturePad.toData();
    if (data.length > 0) {
      data.pop(); // Rimuove l'ultimo tratto vettoriale
      this.signaturePad.fromData(data);
      this.strokesCount.set(data.length);
    }
  }

  clearCanvas(): void {
    if (!this.signaturePad) return;
    this.signaturePad.clear();
    this.strokesCount.set(0);
  }

  // 5. Gestione Timer di 60 secondi
  private startTimer(): void {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      const nextVal = this.timeLeft() - 1;
      this.timeLeft.set(nextVal);

      if (nextVal <= 0) {
        this.stopTimer();
        this.onTimeExpired();
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private onTimeExpired(): void {
    if (this.strokesCount() > 0) {
      // Se l'utente ha disegnato qualcosa, pubblica automaticamente allo scadere dei 60s
      this.publishSketch();
    } else {
      this.errorMessage.set(
        'Tempo scaduto! Non hai disegnato alcun tratto sulla tela. Scegli una nuova parola per riprovare.'
      );
      this.cleanupCanvas();
      this.phase.set('SELECT_WORD');
    }
  }

  // 6. Invio dello Sketch al Back-End
  publishSketch(): void {
    const wordObj = this.selectedWord();
    if (!wordObj || !this.signaturePad || this.strokesCount() === 0) return;

    this.stopTimer();
    this.phase.set('SUBMITTING');
    this.errorMessage.set(null);

    const drawingTimeUsed = Math.max(1, this.MAX_TIME - this.timeLeft());
    const imageDataUrl = this.signaturePad.toDataURL('image/png');

    this.sketchService
      .createSketch(wordObj.text, imageDataUrl, drawingTimeUsed)
      .subscribe({
        next: (createdSketch) => {
          this.router.navigate(['/sketches', createdSketch.id]);
        },
        error: (err) => {
          this.phase.set('DRAWING');
          this.errorMessage.set(
            err.error?.description ||
              'Errore durante il salvataggio dello sketch.'
          );
        },
      });
  }

  getDifficultyBadge(difficulty: string): { label: string; classes: string } {
    if (difficulty === 'EASY') {
      return {
        label: 'Facile',
        classes: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      };
    }
    if (difficulty === 'HARD') {
      return {
        label: 'Difficile',
        classes: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      };
    }
    return {
      label: 'Media',
      classes: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    };
  }

  private cleanupCanvas(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.signaturePad) {
      this.signaturePad.off();
      this.signaturePad = null;
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
    this.cleanupCanvas();
  }
}

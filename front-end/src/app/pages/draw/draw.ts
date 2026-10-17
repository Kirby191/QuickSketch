import {
  Component,
  ElementRef,
  ViewChild,
  HostListener,
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
import { ToastService } from '../../services/toast/toast.service';
import { WordItem } from '../../models/api.models';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state.component';

export type DrawPhase = 'SELECT_WORD' | 'DRAWING' | 'SUBMITTING';
export type DrawTool = 'PEN' | 'BUCKET' | 'ERASER';

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
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  @ViewChild('canvasEl') canvasRef?: ElementRef<HTMLCanvasElement>;

  private signaturePad: SignaturePad | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // Stack cronologici unificati (supportano Undo/Redo sia di tratti pennello sia di riempimenti Secchiello!)
  private undoStack: ImageData[] = [];
  private redoStack: ImageData[] = [];
  private currentSnapshot: ImageData | null = null;

  readonly MAX_TIME = 60;

  readonly colors = [
    { name: 'Nero', hex: '#0f172a' },
    { name: 'Bianco', hex: '#ffffff' },
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

  // Stato Strumenti Canvas (PEN | BUCKET | ERASER) e Timer
  readonly timeLeft = signal<number>(this.MAX_TIME);
  readonly activeColor = signal<string>('#0f172a');
  readonly activeTool = signal<DrawTool>('PEN');
  readonly activeBrushIndex = signal<number>(1);
  readonly strokesCount = signal<number>(0); // Conta tutte le azioni (tratti + riempimenti)
  readonly redoCount = signal<number>(0);
  readonly isDrawing = signal<boolean>(false);

  // Helper per il template
  readonly isEraser = computed(() => this.activeTool() === 'ERASER');
  readonly isBucket = computed(() => this.activeTool() === 'BUCKET');
  readonly isPen = computed(() => this.activeTool() === 'PEN');

  readonly showCanvasHint = computed(
    () => this.strokesCount() === 0 && !this.isDrawing()
  );

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

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (this.phase() !== 'DRAWING') return;

    // Ignora le scorciatoie se il focus si trova accidentalmente in un campo di input
    const targetTag = (event.target as HTMLElement)?.tagName?.toLowerCase();
    if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') {
      return;
    }

    const key = event.key.toLowerCase();

    if ((event.ctrlKey || event.metaKey) && key === 'z') {
      event.preventDefault();
      this.undoLastStroke();
    } else if ((event.ctrlKey || event.metaKey) && key === 'y') {
      event.preventDefault();
      this.redoLastStroke();
    } else if (!event.ctrlKey && !event.metaKey && !event.altKey) {
      if (key === 'p') this.activatePen();
      if (key === 'b' || key === 'f') this.toggleBucketTool();
      if (key === 'e') this.toggleEraser();
      if (key === '1') this.selectBrushSize(0); // Tratto Fine
      if (key === '2') this.selectBrushSize(1); // Tratto Medio
      if (key === '3') this.selectBrushSize(2); // Tratto Spesso
    }
  }

  fetchRandomWords(): void {
    // Raccogliamo le parole attualmente mostrate per escluderle dalla nuova estrazione
    const currentWordsToExclude = this.wordOptions().map((w) => w.text);

    this.stopTimer();
    this.cleanupCanvas();
    this.phase.set('SELECT_WORD');
    this.selectedWord.set(null);
    this.isLoadingWords.set(true);
    this.errorMessage.set(null);

    this.wordService.getRandomWords(3, currentWordsToExclude).subscribe({
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

  chooseWordAndStart(word: WordItem): void {
    this.selectedWord.set(word);
    this.phase.set('DRAWING');
    this.timeLeft.set(this.MAX_TIME);
    this.strokesCount.set(0);
    this.redoCount.set(0);
    this.undoStack = [];
    this.redoStack = [];
    this.currentSnapshot = null;
    this.activeColor.set('#0f172a');
    this.activeTool.set('PEN');
    this.isDrawing.set(false);
    this.errorMessage.set(null);

    setTimeout(() => {
      this.initSignaturePad();
      this.startTimer();
    }, 0);
  }

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

    this.setupCanvasDimensions(true);

    // Prima che inizi un nuovo tratto, salviamo lo snapshot corrente per l'Undo
    this.signaturePad.addEventListener('beginStroke', () => {
      this.isDrawing.set(true);
      if (this.currentSnapshot) {
        this.pushToUndoStack(this.currentSnapshot);
      }
    });

    // A fine tratto aggiorniamo lo snapshot corrente della tela
    this.signaturePad.addEventListener('endStroke', () => {
      this.isDrawing.set(false);
      this.currentSnapshot = this.captureCanvasSnapshot();
      this.strokesCount.set(this.undoStack.length);
    });

    this.resizeObserver = new ResizeObserver(() => {
      this.setupCanvasDimensions(false);
    });
    if (canvas.parentElement) {
      this.resizeObserver.observe(canvas.parentElement);
    }
  }

  private setupCanvasDimensions(isInitial: boolean): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const ratio = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
    const targetWidth = Math.round(rect.width * ratio);
    const targetHeight = Math.round(rect.height * ratio);

    if (!isInitial && canvas.width === targetWidth && canvas.height === targetHeight) {
      return;
    }

    // Se stiamo ridimensionando uno schermo già disegnato, salviamo l'immagine attuale su una canvas temporanea
    let tempCanvas: HTMLCanvasElement | null = null;
    if (!isInitial && this.currentSnapshot) {
      tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.currentSnapshot.width;
      tempCanvas.height = this.currentSnapshot.height;
      tempCanvas.getContext('2d')?.putImageData(this.currentSnapshot, 0, 0);
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Riempie il fondo di bianco iniziale
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    // Se c'era un disegno/riempimento prima del resize, lo ridisegna scalato senza perdere il Flood-Fill
    if (tempCanvas) {
      ctx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight);
    }

    // Ripristina la scala High-DPI per i futuri tratti di SignaturePad
    ctx.scale(ratio, ratio);
    this.currentSnapshot = this.captureCanvasSnapshot();
  }

  private captureCanvasSnapshot(): ImageData | null {
    const canvas = this.canvasRef?.nativeElement;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx || canvas.width === 0 || canvas.height === 0) return null;
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  private restoreCanvasSnapshot(snapshot: ImageData): void {
    const canvas = this.canvasRef?.nativeElement;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;
    ctx.putImageData(snapshot, 0, 0);
    this.currentSnapshot = this.captureCanvasSnapshot();
  }

  private pushToUndoStack(snapshot: ImageData): void {
    // Cloniamo il buffer per sicurezza e limitiamo lo stack agli ultimi 25 passi per risparmiare RAM
    const copy = new ImageData(
      new Uint8ClampedArray(snapshot.data),
      snapshot.width,
      snapshot.height
    );
    this.undoStack.push(copy);
    if (this.undoStack.length > 25) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.redoCount.set(0);
  }

  // --- GESTIONE STRUMENTI (PENNELLO, SECCHIELLO FILL, GOMMA) ---

  selectColor(hex: string): void {
    this.activeColor.set(hex);
    // Se l'utente era sulla gomma e clicca un colore, torna al pennello;
    // se invece era sul Secchiello (BUCKET), rimane sul Secchiello col nuovo colore!
    if (this.activeTool() === 'ERASER') {
      this.activatePen();
    } else if (this.signaturePad && this.activeTool() === 'PEN') {
      this.signaturePad.penColor = hex;
    }
  }

  activatePen(): void {
    this.activeTool.set('PEN');
    if (this.signaturePad) {
      this.signaturePad.penColor = this.activeColor();
      this.applyBrushSize(this.activeBrushIndex());
      this.signaturePad.on(); // Riattiva il disegno a mano libera
    }
  }

  toggleBucketTool(): void {
    if (this.activeTool() === 'BUCKET') {
      this.activatePen();
    } else {
      this.activeTool.set('BUCKET');
      // Disabilita temporaneamente il tracciamento di linee di SignaturePad
      // così il clic sulla canvas esegue solo il Flood Fill!
      this.signaturePad?.off();
    }
  }

  toggleEraser(): void {
    if (this.activeTool() === 'ERASER') {
      this.activatePen();
    } else {
      this.activeTool.set('ERASER');
      if (this.signaturePad) {
        this.signaturePad.penColor = '#ffffff';
        this.applyBrushSize(this.activeBrushIndex());
        this.signaturePad.on();
      }
    }
  }

  selectBrushSize(index: number): void {
    this.activeBrushIndex.set(index);
    if (this.activeTool() === 'BUCKET') {
      this.activatePen();
    } else {
      this.applyBrushSize(index);
    }
  }

  private applyBrushSize(index: number): void {
    if (!this.signaturePad) return;
    const brush = this.brushSizes[index];
    const multiplier = this.activeTool() === 'ERASER' ? 2.4 : 1;
    this.signaturePad.minWidth = brush.min * multiplier;
    this.signaturePad.maxWidth = brush.max * multiplier;
  }

  // --- GESTIONE CLIC SULLA CANVAS (Per nascondere l'hint o eseguire il Flood-Fill) ---

  onCanvasPointerDown(event: PointerEvent): void {
    this.isDrawing.set(true);

    if (this.activeTool() !== 'BUCKET') {
      return; // Se è attivo Pennello o Gomma, ci pensa SignaturePad
    }

    // Se siamo in modalità SECCHIELLO (BUCKET), calcoliamo le coordinate fisiche (x, y) del pixel cliccato
    event.preventDefault();
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const startX = Math.floor((event.clientX - rect.left) * scaleX);
    const startY = Math.floor((event.clientY - rect.top) * scaleY);

    this.executeFloodFillAt(startX, startY, this.activeColor());
    this.isDrawing.set(false);
  }

  /**
   * Algoritmo Scanline Flood-Fill ottimizzato su Uint32Array con tolleranza anti-aliasing.
   * Riempie solo la figura chiusa (o l'area contigua) in cui l'utente ha cliccato.
   */
  private executeFloodFillAt(startX: number, startY: number, fillHex: string): void {
    const canvas = this.canvasRef?.nativeElement;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data8 = imageData.data;
    const data32 = new Uint32Array(data8.buffer);

    // Convertiamo il colore Hex scelto in RGB
    const [fillR, fillG, fillB] = this.hexToRgb(fillHex);

    // Costruiamo l'intero a 32-bit in formato Little-Endian (ABGR) per scritture ultra-veloci
    const fillColor32 =
      (255 << 24) | (fillB << 16) | (fillG << 8) | fillR;

    const startIdx = (startY * width + startX) * 4;
    const startR = data8[startIdx];
    const startG = data8[startIdx + 1];
    const startB = data8[startIdx + 2];
    const startA = data8[startIdx + 3];

    // Se il punto cliccato ha già esattamente lo stesso colore del secchiello, non fare nulla
    if (
      Math.abs(startR - fillR) <= 3 &&
      Math.abs(startG - fillG) <= 3 &&
      Math.abs(startB - fillB) <= 3 &&
      startA >= 250
    ) {
      return;
    }

    // Salva lo stato corrente nello stack di Undo prima di colorare l'area
    if (this.currentSnapshot) {
      this.pushToUndoStack(this.currentSnapshot);
    }

    // Tolleranza cromatica (65 su scala 0-255 per canale) per assorbire i pixel anti-aliasing dei bordi curvi
    const TOLERANCE = 65;
    const visited = new Uint8Array(width * height);

    const matchesTarget = (pixelPos: number): boolean => {
      if (visited[pixelPos]) return false;
      const idx = pixelPos * 4;
      const dr = Math.abs(data8[idx] - startR);
      const dg = Math.abs(data8[idx + 1] - startG);
      const db = Math.abs(data8[idx + 2] - startB);
      return dr <= TOLERANCE && dg <= TOLERANCE && db <= TOLERANCE;
    };

    // Coda Scanline basata su array tipizzato pre-allocato (Zero Garbage Collection!)
    const stackX = new Int32Array(width * height);
    const stackY = new Int32Array(width * height);
    let stackPtr = 0;

    stackX[stackPtr] = startX;
    stackY[stackPtr] = startY;
    stackPtr++;

    while (stackPtr > 0) {
      stackPtr--;
      let x = stackX[stackPtr];
      const y = stackY[stackPtr];
      const rowOffset = y * width;

      // Risale a sinistra lungo la riga finché il colore corrisponde all'area iniziale
      while (x >= 0 && matchesTarget(rowOffset + x)) {
        x--;
      }
      x++;

      let spanAbove = false;
      let spanBelow = false;

      // Colora l'intera linea orizzontale (Scanline) verso destra e controlla sopra/sotto
      while (x < width && matchesTarget(rowOffset + x)) {
        const pos = rowOffset + x;
        visited[pos] = 1;
        data32[pos] = fillColor32;

        // Controllo riga superiore (y - 1)
        if (y > 0) {
          const abovePos = pos - width;
          if (matchesTarget(abovePos)) {
            if (!spanAbove) {
              stackX[stackPtr] = x;
              stackY[stackPtr] = y - 1;
              stackPtr++;
              spanAbove = true;
            }
          } else {
            spanAbove = false;
          }
        }

        // Controllo riga inferiore (y + 1)
        if (y < height - 1) {
          const belowPos = pos + width;
          if (matchesTarget(belowPos)) {
            if (!spanBelow) {
              stackX[stackPtr] = x;
              stackY[stackPtr] = y + 1;
              stackPtr++;
              spanBelow = true;
            }
          } else {
            spanBelow = false;
          }
        }

        x++;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    this.currentSnapshot = this.captureCanvasSnapshot();
    this.strokesCount.set(this.undoStack.length);
  }

  private hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace('#', '');
    const num = Number.parseInt(clean, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  // --- UNDO, REDO E CLEAR UNIFICATI ---

  undoLastStroke(): void {
    if (this.undoStack.length === 0) return;

    const previousSnapshot = this.undoStack.pop();
    if (previousSnapshot && this.currentSnapshot) {
      this.redoStack.push(this.currentSnapshot);
      this.redoCount.set(this.redoStack.length);
      this.restoreCanvasSnapshot(previousSnapshot);
      this.strokesCount.set(this.undoStack.length);
    }
  }

  redoLastStroke(): void {
    if (this.redoStack.length === 0) return;

    const nextSnapshot = this.redoStack.pop();
    if (nextSnapshot && this.currentSnapshot) {
      this.undoStack.push(this.currentSnapshot);
      this.redoCount.set(this.redoStack.length);
      this.restoreCanvasSnapshot(nextSnapshot);
      this.strokesCount.set(this.undoStack.length);
    }
  }

  clearCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;

    // Salva il disegno corrente nello stack di Undo prima di pulire la tela!
    if (this.currentSnapshot && this.strokesCount() > 0) {
      this.pushToUndoStack(this.currentSnapshot);
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    this.signaturePad?.clear();
    this.isDrawing.set(false);
    this.currentSnapshot = this.captureCanvasSnapshot();
    this.strokesCount.set(this.undoStack.length);
  }

  // --- TIMER E PUBBLICAZIONE SKETCH ---

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
      this.publishSketch();
    } else {
      this.errorMessage.set(
        'Tempo scaduto! Non hai disegnato alcun tratto sulla tela. Scegli una nuova parola per riprovare.'
      );
      this.cleanupCanvas();
      this.phase.set('SELECT_WORD');
    }
  }

  publishSketch(): void {
    const wordObj = this.selectedWord();
    const canvas = this.canvasRef?.nativeElement;
    if (!wordObj || !canvas || !this.canPublish()) return;

    this.stopTimer();
    this.phase.set('SUBMITTING');
    this.errorMessage.set(null);

    const drawingTimeUsed = Math.max(1, this.MAX_TIME - this.timeLeft());
    // Usiamo direttamente canvas.toDataURL() così esporta fedelmente sia i tratti vettoriali sia i riempimenti Flood-Fill!
    const imageDataUrl = canvas.toDataURL('image/png');

    this.sketchService
      .createSketch(wordObj.text, imageDataUrl, drawingTimeUsed)
      .subscribe({
        next: (createdSketch) => {
          this.toastService.show(
            `Sketch "${wordObj.text.toUpperCase()}" pubblicato in ${drawingTimeUsed}s!`,
            'SUCCESS'
          );
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
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../services/auth/auth.service';
import { SketchService } from '../../services/sketch/sketch.service';
import { PlaySketchComponent } from './play-sketch';

describe('PlaySketchComponent', () => {
  let fixture: ComponentFixture<PlaySketchComponent>;
  let component: PlaySketchComponent;
  let sketchService: Record<string, ReturnType<typeof vi.fn>>;
  const sketch = {
    id: 1,
    author: { id: 2, username: 'Artist' },
    category: 'Animali',
    imageData: 'data:image/png;base64,x',
    drawingTime: 12,
    wordLength: 5,
    word: null,
    stats: { totalPlayers: 0, solvedCount: 0 },
    userContext: { canPlay: true, attemptsCount: 0, guessedWords: [], closeWords: [], isAuthor: false, status: 'NOT_STARTED', remainingAttempts: 10 },
  } as never;

  beforeEach(async () => {
    sketchService = {
      getSketchById: vi.fn(() => of(sketch)),
      submitGuess: vi.fn(() => of({ message: 'Quasi!', isCorrect: false, isCloseGuess: true, status: 'IN_PROGRESS', attemptsCount: 1, remainingAttempts: 9, guessedWords: ['gatto'], solution: null })),
    };
    await TestBed.configureTestingModule({
      imports: [PlaySketchComponent],
      providers: [
        { provide: SketchService, useValue: sketchService },
        { provide: AuthService, useValue: { isAuthenticated: () => true, openAuthModal: vi.fn() } },
        provideRouter([]),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PlaySketchComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', '1');
    fixture.detectChanges();
  });

  it('loads a sketch and computes hidden word hints', () => {
    expect(component.sketch()).toBe(sketch);
    component.currentGuess.set('cat');
    expect(component.wordCharacters()).toEqual(['C', 'A', 'T', '?', '?']);
    expect(component.clientHint()?.isBlocking).toBe(false);
    expect(component.attemptSegments().length).toBe(10);
  });

  it('submits guesses, tracks close words and updates context', () => {
    component.currentGuess.set('gatto');
    component.onSubmitGuess();
    expect(sketchService['submitGuess']).toHaveBeenCalledWith(1, 'gatto');
    expect(component.isCloseWord('GATTO')).toBe(true);
    expect(component.feedbackBanner()?.type).toBe('WARNING');
    expect(component.sketch()?.userContext?.attemptsCount).toBe(1);
  });

  it('reports invalid ids and request failures', () => {
    fixture.componentRef.setInput('id', 'not-a-number');
    fixture.detectChanges();
    expect(component.errorMessage()).toBe('ID dello sketch non valido.');
    sketchService['getSketchById'].mockReturnValue(throwError(() => ({ error: { description: 'not found' } })));
    component.loadSketch(4);
    expect(component.errorMessage()).toBe('not found');
  });

  it('navigates back to the gallery', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.goBackToGallery();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(component.isResultModalOpen()).toBe(false);
  });

  it('renders the playable sketch and blocks an already tried guess', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="sketch-detail-author"]')).toBeTruthy();
    component.currentGuess.set('gatto');
    component.sketch.update((current) => current ? {
      ...current,
      userContext: { ...current.userContext!, guessedWords: ['gatto'] },
    } : current);
    fixture.detectChanges();
    expect(component.clientHint()?.isBlocking).toBe(true);
    expect(component.canSubmitGuess()).toBe(false);
  });
});

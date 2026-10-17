import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../services/auth/auth.service';
import { SketchService } from '../../services/sketch/sketch.service';
import { GalleryComponent } from './gallery';

describe('GalleryComponent', () => {
  let fixture: ComponentFixture<GalleryComponent>;
  let component: GalleryComponent;
  let sketches: Record<string, ReturnType<typeof vi.fn>>;
  let auth: Record<string, unknown>;

  const data = [
    { id: 1, author: { username: 'Alice' }, stats: { solvedCount: 0, totalPlayers: 0 }, userContext: { canPlay: true, status: 'NOT_STARTED', isAuthor: false } },
    { id: 2, author: { username: 'Bob' }, stats: { solvedCount: 1, totalPlayers: 1 }, userContext: { canPlay: false, status: 'WON', isAuthor: true } },
  ] as never[];

  beforeEach(async () => {
    sketches = {
      getSketches: vi.fn(() => of(data)),
      deleteSketch: vi.fn(() => of({ message: 'ok' })),
    };
    auth = {
      isAuthenticated: () => false,
      isAdmin: () => false,
      currentUser: () => null,
      openAuthModal: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [GalleryComponent],
      providers: [
        { provide: SketchService, useValue: sketches },
        { provide: AuthService, useValue: auth },
        provideRouter([]),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(GalleryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads sketches and filters by author, status and category', () => {
    expect(component.sketches()).toEqual(data);
    component.authorSearch.set('alice');
    expect(component.filteredSketches().length).toBe(1);
    component.authorSearch.set('');
    component.setStatusFilter('PLAYABLE');
    expect(component.filteredSketches().map((item) => item.id)).toEqual([1]);
    component.selectCategory('Animali');
    component.loadSketches();
    expect(sketches['getSketches']).toHaveBeenCalledWith('Animali', undefined, 24, 0);
  });

  it('loads more pages and prevents duplicate pagination requests', () => {
    component.hasMorePages.set(true);
    component.loadMoreSketches();
    expect(component.sketches().length).toBe(4);
    expect(component.isLoadingMore()).toBe(false);
  });

  it('deletes the selected sketch and reports load errors', () => {
    component.confirmDelete(data[0] as never, { stopPropagation: vi.fn() } as never);
    component.executeDelete();
    expect(component.sketches().map((item) => item.id)).toEqual([2]);
    sketches['getSketches'].mockReturnValue(throwError(() => ({ error: { description: 'offline' } })));
    component.loadSketches();
    expect(component.errorMessage()).toBe('offline');
  });

  it('navigates authenticated users and opens login for guests', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.onOpenSketch(data[0] as never);
    expect(router.navigate).toHaveBeenCalledWith(['/sketches', 1]);
    component.onStartDrawing();
    expect(auth['openAuthModal']).toHaveBeenCalledWith('LOGIN', '/draw');
  });

  it('renders the gallery error state and retry action', () => {
    sketches['getSketches'].mockReturnValue(throwError(() => ({ error: { description: 'server offline' } })));
    component.loadSketches();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="gallery-error-banner"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('server offline');
  });
});

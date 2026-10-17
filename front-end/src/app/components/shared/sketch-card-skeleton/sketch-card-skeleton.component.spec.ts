import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SketchCardSkeletonComponent } from './sketch-card-skeleton.component';

describe('SketchCardSkeletonComponent', () => {
  let fixture: ComponentFixture<SketchCardSkeletonComponent>;
  let component: SketchCardSkeletonComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SketchCardSkeletonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SketchCardSkeletonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the default six loading cards with loading semantics', () => {
    expect(component.count()).toBe(6);
    expect(component.itemsArray()).toEqual([0, 1, 2, 3, 4, 5]);
    const grid = fixture.nativeElement.querySelector('[data-testid="sketch-skeleton-grid"]');
    expect(grid.getAttribute('aria-busy')).toBe('true');
    expect(grid.getAttribute('aria-label')).toBe('Caricamento disegni in corso');
    expect(grid.children.length).toBe(6);
  });

  it('renders the requested number of cards and handles zero', () => {
    fixture.componentRef.setInput('count', 3);
    fixture.detectChanges();
    expect(component.itemsArray()).toEqual([0, 1, 2]);
    expect(fixture.nativeElement.querySelector('[data-testid="sketch-skeleton-grid"]').children.length).toBe(3);

    fixture.componentRef.setInput('count', 0);
    fixture.detectChanges();
    expect(component.itemsArray()).toEqual([]);
    expect(fixture.nativeElement.querySelector('[data-testid="sketch-skeleton-grid"]').children.length).toBe(0);
  });
});

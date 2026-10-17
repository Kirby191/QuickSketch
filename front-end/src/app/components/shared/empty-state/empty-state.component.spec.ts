import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  let fixture: ComponentFixture<EmptyStateComponent>;
  let component: EmptyStateComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [EmptyStateComponent] }).compileComponents();
    fixture = TestBed.createComponent(EmptyStateComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Nessun risultato');
    fixture.componentRef.setInput('description', 'Prova più tardi');
    fixture.componentRef.setInput('actionLabel', 'Riprova');
    fixture.componentRef.setInput('secondaryActionLabel', 'Indietro');
    fixture.detectChanges();
  });

  it('renders all configured content and actions', () => {
    expect(fixture.nativeElement.textContent).toContain('Nessun risultato');
    expect(fixture.nativeElement.textContent).toContain('Prova più tardi');
    expect(fixture.nativeElement.querySelector('[data-testid="empty-state-primary-btn"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="empty-state-secondary-btn"]')).toBeTruthy();
  });

  it('emits primary and secondary actions', () => {
    const primary = vi.fn();
    const secondary = vi.fn();
    component.actionClicked.subscribe(primary);
    component.secondaryActionClicked.subscribe(secondary);
    fixture.nativeElement.querySelector('[data-testid="empty-state-primary-btn"]').click();
    fixture.nativeElement.querySelector('[data-testid="empty-state-secondary-btn"]').click();
    expect(primary).toHaveBeenCalledOnce();
    expect(secondary).toHaveBeenCalledOnce();
  });
});

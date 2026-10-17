import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalComponent } from './modal.component';

// Verifica visibilità, accessibilità di base e chiusura del contenitore modale.
describe('ModalComponent', () => {
  let fixture: ComponentFixture<ModalComponent>;
  let component: ModalComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ModalComponent] }).compileComponents();
    fixture = TestBed.createComponent(ModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('title', 'Titolo');
    fixture.detectChanges();
  });

  // L'apertura blocca lo scroll della pagina e la chiusura lo ripristina.
  it('renders only when open and manages body scrolling', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="modal-backdrop"]')).toBeNull();
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="modal-title"]').textContent).toContain('Titolo');
    expect(document.body.style.overflow).toBe('hidden');
    fixture.componentRef.setInput('isOpen', false);
    fixture.detectChanges();
    expect(document.body.style.overflow).toBe('');
  });

  // Tutti i canali previsti per chiudere il modale notificano lo stesso evento.
  it('emits close from the button, backdrop and Escape', () => {
    const closed = vi.fn();
    component.closed.subscribe(closed);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[data-testid="modal-close-btn"]').click();
    fixture.nativeElement.querySelector('[data-testid="modal-backdrop"]').click();
    component.onEscapePressed();
    expect(closed).toHaveBeenCalledTimes(3);
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastService } from '../../../services/toast/toast.service';
import { ToastContainerComponent } from './toast-container.component';

describe('ToastContainerComponent', () => {
  let fixture: ComponentFixture<ToastContainerComponent>;
  let service: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ToastContainerComponent] }).compileComponents();
    fixture = TestBed.createComponent(ToastContainerComponent);
    service = TestBed.inject(ToastService);
    service.show('Operazione completata', 'SUCCESS', 10000);
    fixture.detectChanges();
  });

  it('renders toast messages and dismisses them through the UI', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="toast-notification"]').textContent)
      .toContain('Operazione completata');
    fixture.nativeElement.querySelector('[data-testid="toast-notification"] button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="toast-notification"]')).toBeNull();
  });
});

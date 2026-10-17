import { Component, inject } from '@angular/core';
import { ToastService } from '../../../services/toast/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  templateUrl: './toast-container.component.html',
})
export class ToastContainerComponent {
  // Espone al template la lista reattiva dei messaggi da visualizzare.
  readonly toastService = inject(ToastService);
}

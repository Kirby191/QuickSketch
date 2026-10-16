import { TestBed } from '@angular/core/testing';
import { CanDeactivateFn } from '@angular/router';
import { pendingDrawingGuard } from './pending-drawing.guard';
import { DrawComponent } from '../../pages/draw/draw';

describe('pendingDrawingGuard', () => {
  const executeGuard: CanDeactivateFn<DrawComponent> = (...guardParameters) =>
    TestBed.runInInjectionContext(() => pendingDrawingGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AuthService } from './services/auth/auth.service';

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let component: App;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('creates the application shell with its global regions', () => {
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-navbar')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-auth-modal')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-toast-container')).toBeTruthy();
  });

  it('renders the institutional footer content', () => {
    const footer = fixture.nativeElement.querySelector('footer');
    expect(footer).toBeTruthy();
    expect(footer.textContent).toContain('QuickSketch');
    expect(footer.textContent).toContain('Università degli Studi di Napoli Federico II');
  });

  it('exposes the singleton authentication service to the shell', () => {
    expect(component.authService).toBe(TestBed.inject(AuthService));
    expect(component.authService.isAuthModalOpen()).toBe(false);
  });
});

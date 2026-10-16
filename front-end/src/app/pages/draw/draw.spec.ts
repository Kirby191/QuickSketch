import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DrawComponent } from './draw';

describe('DrawComponent', () => {
  let component: DrawComponent;
  let fixture: ComponentFixture<DrawComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DrawComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DrawComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

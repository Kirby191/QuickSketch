import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Draw } from './draw';

describe('Draw', () => {
  let component: Draw;
  let fixture: ComponentFixture<Draw>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Draw],
    }).compileComponents();

    fixture = TestBed.createComponent(Draw);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlaySketchComponent } from './play-sketch';

describe('PlaySketchComponent', () => {
  let component: PlaySketchComponent;
  let fixture: ComponentFixture<PlaySketchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlaySketchComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PlaySketchComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

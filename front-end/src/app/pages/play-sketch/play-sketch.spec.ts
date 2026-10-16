import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlaySketch } from './play-sketch';

describe('PlaySketch', () => {
  let component: PlaySketch;
  let fixture: ComponentFixture<PlaySketch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlaySketch],
    }).compileComponents();

    fixture = TestBed.createComponent(PlaySketch);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { PlaySketchComponent } from './play-sketch';

describe('PlaySketchComponent', () => {
  let component: PlaySketchComponent;
  let fixture: ComponentFixture<PlaySketchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlaySketchComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PlaySketchComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', '1');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

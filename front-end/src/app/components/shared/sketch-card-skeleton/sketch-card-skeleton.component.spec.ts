import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SketchCardSkeletonComponent } from './sketch-card-skeleton.component';

describe('SketchCardSkeletonComponent', () => {
  let component: SketchCardSkeletonComponent;
  let fixture: ComponentFixture<SketchCardSkeletonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SketchCardSkeletonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SketchCardSkeletonComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

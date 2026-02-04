import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MoveDetailComponent } from './move-detail.component';

describe('MoveDetailComponent', () => {
  let component: MoveDetailComponent;
  let fixture: ComponentFixture<MoveDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoveDetailComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(MoveDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

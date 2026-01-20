import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuoteReviewComponent } from './quote-review.component';

describe('QuoteReviewComponent', () => {
  let component: QuoteReviewComponent;
  let fixture: ComponentFixture<QuoteReviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuoteReviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuoteReviewComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

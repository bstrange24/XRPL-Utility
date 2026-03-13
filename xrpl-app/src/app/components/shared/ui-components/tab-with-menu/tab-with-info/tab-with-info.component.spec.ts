import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabWithInfoComponent } from './tab-with-info.component';

describe('TabWithInfoComponent', () => {
  let component: TabWithInfoComponent;
  let fixture: ComponentFixture<TabWithInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabWithInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TabWithInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

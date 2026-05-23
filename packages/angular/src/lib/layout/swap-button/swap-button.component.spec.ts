import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { BreakpointObserver } from '@angular/cdk/layout';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { SwapButtonComponent } from '@ncs_software/widget-system-angular';

describe('SwapButtonComponent', () => {
  let fixture: ComponentFixture<SwapButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SwapButtonComponent],
      providers: [
        provideNoopAnimations(),
        {
          provide: BreakpointObserver,
          useValue: {
            observe: () => of({ matches: false, breakpoints: {} }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SwapButtonComponent);
    fixture.detectChanges();
  });

  it('emits swap on click', () => {
    const swap = vi.fn();
    fixture.componentInstance.swap.subscribe(swap);

    fixture.nativeElement.querySelector('button')!.click();

    expect(swap).toHaveBeenCalledOnce();
  });

  it('uses horizontal icon above 768px', () => {
    const icon = fixture.nativeElement.querySelector('mat-icon');
    expect(icon.textContent.trim()).toBe('swap_horiz');
  });
});

describe('SwapButtonComponent (narrow viewport)', () => {
  let fixture: ComponentFixture<SwapButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SwapButtonComponent],
      providers: [
        provideNoopAnimations(),
        {
          provide: BreakpointObserver,
          useValue: {
            observe: () => of({ matches: true, breakpoints: {} }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SwapButtonComponent);
    fixture.detectChanges();
  });

  it('uses vertical icon below 768px', () => {
    const icon = fixture.nativeElement.querySelector('mat-icon');
    expect(icon.textContent.trim()).toBe('swap_vert');
  });
});

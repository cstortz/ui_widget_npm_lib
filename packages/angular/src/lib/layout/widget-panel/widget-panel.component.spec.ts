import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WidgetPanelComponent } from '@ncs_software/widget-system-angular';

describe('WidgetPanelComponent', () => {
  let fixture: ComponentFixture<WidgetPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WidgetPanelComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(WidgetPanelComponent);
    fixture.componentRef.setInput('title', 'Notes');
    fixture.detectChanges();
  });

  it('hides content when collapsed', () => {
    const content = fixture.nativeElement.querySelector('.wdg-widget-panel__content');
    expect(content).toBeTruthy();

    fixture.nativeElement.querySelector('button')!.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.wdg-widget-panel__content--hidden')).toBeTruthy();
  });

  it('emits collapseChange when toggled', () => {
    const collapseChange = vi.fn();
    fixture.componentInstance.collapseChange.subscribe(collapseChange);

    fixture.nativeElement.querySelector('button')!.click();
    expect(collapseChange).toHaveBeenCalledWith(true);

    fixture.nativeElement.querySelector('button')!.click();
    expect(collapseChange).toHaveBeenCalledWith(false);
  });

  it('starts collapsed when initialCollapsed is true', async () => {
    const collapsedFixture = TestBed.createComponent(WidgetPanelComponent);
    collapsedFixture.componentRef.setInput('title', 'Notes');
    collapsedFixture.componentRef.setInput('initialCollapsed', true);
    collapsedFixture.detectChanges();

    expect(
      collapsedFixture.nativeElement.querySelector('.wdg-widget-panel__content--hidden')
    ).toBeTruthy();
  });
});

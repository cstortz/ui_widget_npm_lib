import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryWidgetStateAdapter } from '@ncs_software/widget-system';
import {
  WorkspaceLayoutComponent,
  provideWidgetSystem,
  WidgetStateService,
} from '@ncs_software/widget-system-angular';
import { makeWorkspace } from '../../../test-helpers';

@Component({
  standalone: true,
  imports: [WorkspaceLayoutComponent],
  template: `
    <wdg-workspace-layout workspaceId="ws-1">
      <div primaryPanel>Primary panel</div>
      <div secondaryPanel>Secondary panel</div>
    </wdg-workspace-layout>
  `,
})
class TestHostComponent {}

describe('WorkspaceLayoutComponent', () => {
  let adapter: MemoryWidgetStateAdapter;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    adapter = new MemoryWidgetStateAdapter();
    await adapter.saveWorkspace(makeWorkspace());

    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [provideNoopAnimations(), provideWidgetSystem({ adapter }), WidgetStateService],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('applies swapped class when panelOrder is primary-right', async () => {
    await adapter.saveWorkspace(makeWorkspace({ panelOrder: 'primary-right' }));
    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const layout = fixture.nativeElement.querySelector('.wdg-workspace-layout');
    expect(layout.classList.contains('wdg-workspace-layout--swapped')).toBe(true);
  });

  it('persists panelOrder after swap', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button.wdg-swap-button')!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const saved = await adapter.loadWorkspace('ws-1');
    expect(saved?.panelOrder).toBe('primary-right');
    expect(
      fixture.nativeElement
        .querySelector('.wdg-workspace-layout')
        .classList.contains('wdg-workspace-layout--swapped')
    ).toBe(true);
  });
});

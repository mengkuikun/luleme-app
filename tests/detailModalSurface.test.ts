import { describe, expect, it } from 'vitest';
import { getDetailPaneSurfaceClass, getDetailSheetSurfaceClass, getDetailViewportBaseClass } from '../utils/detailModalSurface';

describe('detail modal surface classes', () => {
  it('provides a solid isolated surface for list and add panes', () => {
    const className = getDetailPaneSurfaceClass();
    expect(className).toContain('bg-white');
    expect(className).toContain('dark:bg-slate-900');
    expect(className).toContain('isolate');
    expect(className).toContain('[contain:paint]');
  });

  it('locks panes into their own paint layer to avoid mobile flicker', () => {
    const className = getDetailPaneSurfaceClass();
    expect(className).toContain('[backface-visibility:hidden]');
    expect(className).toContain('[transform:translateZ(0)]');
    expect(className).toContain('[will-change:transform,opacity]');
  });

  it('stabilizes the sheet shell during height changes without altering timing', () => {
    const className = getDetailSheetSurfaceClass();
    expect(className).toContain('isolate');
    expect(className).toContain('[contain:paint]');
    expect(className).toContain('[backface-visibility:hidden]');
    expect(className).toContain('[transform:translateZ(0)]');
    expect(className).toContain('[will-change:height,max-height]');
  });

  it('provides a dedicated viewport base surface behind animated panes', () => {
    const className = getDetailViewportBaseClass();
    expect(className).toContain('absolute');
    expect(className).toContain('inset-0');
    expect(className).toContain('bg-white');
    expect(className).toContain('dark:bg-slate-900');
    expect(className).toContain('pointer-events-none');
  });
});

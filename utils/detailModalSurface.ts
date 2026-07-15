export function getDetailPaneSurfaceClass(): string {
  return 'isolate bg-white dark:bg-slate-900 [contain:paint] [backface-visibility:hidden] [transform:translateZ(0)] [will-change:transform,opacity]';
}

export function getDetailSheetSurfaceClass(): string {
  return 'isolate [contain:paint] [backface-visibility:hidden] [transform:translateZ(0)] [will-change:height,max-height]';
}

export function getDetailViewportBaseClass(): string {
  return 'absolute inset-0 bg-white dark:bg-slate-900 pointer-events-none';
}

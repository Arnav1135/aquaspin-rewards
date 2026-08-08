/** Shared lifecycle helpers for browser game renderers. */
export function cancelAnimationFrameSafe(id: number | null): void {
  if (id !== null && typeof window !== 'undefined') window.cancelAnimationFrame(id);
}

export function disposeThreeObject(root: { traverse?: (cb: (object: any) => void) => void }): void {
  root.traverse?.((object: any) => {
    object.geometry?.dispose?.();
    const material = object.material;
    if (Array.isArray(material)) material.forEach(m => m?.dispose?.());
    else material?.dispose?.();
  });
}

export function isWebGLContextLost(gl: WebGLRenderingContext | WebGL2RenderingContext | null): boolean {
  return !!gl && typeof gl.isContextLost === 'function' && gl.isContextLost();
}

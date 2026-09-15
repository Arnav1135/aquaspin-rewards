const timeouts = new Set<number>();
const intervals = new Set<number>();
const rafs = new Set<number>();
const eventListeners = new Map<EventTarget, Map<string, Set<any>>>();

export const gameSetTimeout = (cb: TimerHandler, delay?: number) => {
  const id = window.setTimeout(cb, delay);
  timeouts.add(id);
  return id;
};

export const gameSetInterval = (cb: TimerHandler, delay?: number) => {
  const id = window.setInterval(cb, delay);
  intervals.add(id);
  return id;
};

export const gameRequestAnimationFrame = (cb: FrameRequestCallback) => {
  const id = window.requestAnimationFrame(cb);
  rafs.add(id);
  return id;
};

export const gameAddEventListener = (target: EventTarget | null, type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
  if (!target) return;
  target.addEventListener(type, listener, options);
  if (!eventListeners.has(target)) eventListeners.set(target, new Map());
  const targetMap = eventListeners.get(target)!;
  if (!targetMap.has(type)) targetMap.set(type, new Set());
  targetMap.get(type)!.add({ listener, options });
};

export const clearGameTimers = () => {
  timeouts.forEach(id => window.clearTimeout(id));
  intervals.forEach(id => window.clearInterval(id));
  rafs.forEach(id => window.cancelAnimationFrame(id));
  
  eventListeners.forEach((targetMap, target) => {
    targetMap.forEach((listeners, type) => {
      listeners.forEach(({ listener, options }) => {
        target.removeEventListener(type, listener, options);
      });
    });
  });

  timeouts.clear();
  intervals.clear();
  rafs.clear();
  eventListeners.clear();
};

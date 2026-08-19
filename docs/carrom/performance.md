# Carrom Performance & Optimization

## Governor System
The `CarromPerformanceManager` continuously monitors frame time. If it detects sustained drops below the target framerate, it dynamically downgrades settings.

## Memory Leak Prevention
- Assets are aggressively disposed on unmount.
- Object pooling is heavily enforced for coins and particles.
- WebGL contexts are monitored and gracefully recovered if lost.

## Mobile Optimization
- Reduced shadow resolution.
- Capped Device Pixel Ratio.
- Reduced particle emission counts.
- Lower geometry segmentation for coins.

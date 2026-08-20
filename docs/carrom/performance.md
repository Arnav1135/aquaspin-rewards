# Performance Governor

The `CarromPerformanceGovernor` monitors the active framerate and adjusts quality settings dynamically.

## Degradation Order
If FPS falls consistently below 30 on desktop (or standard thresholds on mobile):
1. **ULTRA -> HIGH**: Drops extreme environment reflections and particle counts.
2. **HIGH -> MEDIUM**: Further reduces shadows and VFX.
3. **MEDIUM -> LOW**: Disables most screen-space effects, relying purely on raw geometry and basic materials.

Physics deterministic correctness is **never** compromised, regardless of render quality.

# Rendering Resilience

To ensure the game never soft-locks due to graphic errors, we implement `CarromRenderGuard`.

## WebGL Context Loss Recovery
When `webglcontextlost` fires (often due to OS suspension or GPU driver resets), the guard pauses gameplay and displays an overlay. When `webglcontextrestored` fires, the game continues.

## Error Boundaries
The React-based guard catches shader compilation and rendering errors, allowing the engine to gracefully restart or fallback without crashing the entire browser tab.

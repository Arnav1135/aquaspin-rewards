# Candy Crunch — Performance Benchmarking & Adaptive Quality

## Overview
The `QualityManager` dynamically monitors real-time frame rates and adjusts rendering parameters to guarantee a smooth 60fps experience.

## Performance Profiles

| Preset | Resolution Scale | Pixel Ratio | Shadow Quality | Particle Multiplier |
| :--- | :--- | :--- | :--- | :--- |
| **LOW** | 0.7x | 1.0 | None | 0.25x |
| **MEDIUM** | 1.0x | Min(DPR, 1.5) | Basic (512 map) | 0.5x |
| **HIGH** | 1.0x | Min(DPR, 2.0) | Soft (1024 map) | 1.0x |
| **ULTRA** | 1.0x | Native DPR | High-Res (2048 map) | 2.0x |

## Adaptive Quality Hysteresis
- Evaluates average FPS over 5-second sliding windows.
- Automatically downgrades profile if FPS < 40; upgrades profile if FPS > 58.

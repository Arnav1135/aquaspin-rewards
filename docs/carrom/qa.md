# Carrom Automated QA

## Physics Simulator
A headless simulator can execute 1000 randomized valid shots to verify that no coins tunnel, escape the board bounds, or achieve infinite velocity (NaN state).

## Visual Regression
The QA pipeline takes deterministic screenshots of the board at rest and after a fixed shot sequence to ensure material or lighting upgrades do not break visibility.

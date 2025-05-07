# CMSC410 Final Project: Procedural Terrain Rendering with Interactive Camera

**Author:** Ethan Wight  
**Date:** May 6, 2025

## 📌 Project Overview

This WebGL project procedurally generates a 3D terrain environment complete with realistic water, dynamic lighting, trees, pebbles, and a randomly placed house. It includes both manual and automatic camera controls, implementing key concepts such as:

- Geometric modeling
- Scene rendering with shaders
- Phong lighting model
- Camera manipulation
- Procedural terrain generation

## 🌄 Features

- **Terrain Generation**: Uses sinusoidal functions to generate height maps and applies smoothing filters for realism.
- **Water Simulation**: Implements animated waves via vertex shader logic.
- **Lighting**: Uses Phong lighting in the fragment shader with distinct material properties for terrain, water, and sky.
- **Camera Modes**: 
  - Manual: Move and rotate freely using keyboard keys.
  - Automatic: Toggle auto-flight path with the spacebar.
- **Objects**:
  - Randomly placed trees and pebbles
  - House placed at suitable terrain elevation

## 🎮 Controls

- **W/S** – Move forward/backward  
- **A/D** – Strafe left/right  
- **Q/E** – Move up/down  
- **Arrow Keys** – Look around  
- **Space** – Toggle auto-flight mode  

## 🛠 How to Run

1. **Open `Terrain.html` in a WebGL-enabled browser.**
   - Make sure all dependencies (`Terrain.js`, `MV.js`, `initShaders.js`, and `webgl-utils.js`) are in the same directory.

2. The scene will render in the HTML5 `<canvas>` element.

3. Use the controls to explore the terrain manually or toggle auto-flight.

## 📁 File Structure

- `Terrain.html` – Main HTML file with embedded shaders
- `Terrain.js` – Core JavaScript logic for terrain generation and rendering
- `MV.js` – Math utility functions (vector and matrix operations)
- `initShaders.js` – Helper for compiling and linking shaders
- `webgl-utils.js` – WebGL context and animation helpers

## 📚 Project Requirements Covered

This project satisfies the following key requirements from **CMSC410 Project 4**:

✅ Procedural terrain and object generation  
✅ Manual and automatic camera movement  
✅ Skybox interpolation and water with wavy animation  
✅ Phong lighting model with variable material properties  
✅ Scene composition with trees, rocks, and a house  

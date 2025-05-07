/*
Ethan Wight
5/6/2025
CMSC 410 - Computer Graphics
Final Project
*/

"use strict";

// Global variables for WebGL context and canvas
var canvas;
var gl;

// Total number of vertices in the scene
// Includes terrain, grid, trees, pebbles, and house
var numVertices = (512 * 512) + (512 * 512) + (20 * (36 + 36)) + (300 * 36) + (100);

// Arrays to store vertex data
var pointsArray = [];  // Vertex positions
var colorsArray = [];  // Vertex colors

// Cube vertices definition (used for various objects)
var vertices = [
    vec4(-0.5, -0.5, 0.5, 1.0),  // Front bottom left
    vec4(-0.5, 0.5, 0.5, 1.0),   // Front top left
    vec4(0.5, 0.5, 0.5, 1.0),    // Front top right
    vec4(0.5, -0.5, 0.5, 1.0),   // Front bottom right
    vec4(-0.5, -0.5, -0.5, 1.0), // Back bottom left
    vec4(-0.5, 0.5, -0.5, 1.0),  // Back top left
    vec4(0.5, 0.5, -0.5, 1.0),   // Back top right
    vec4(0.5, -0.5, -0.5, 1.0)   // Back bottom right
];

// Camera parameters
var near = 0.1;        // How close we can see
var far = 100.0;       // How far we can see
var radius = 1.0;      // How far our camera orbits from the center
var theta = 45.0 * Math.PI/180.0;  // Camera's horizontal rotation
var phi = 0.0 * Math.PI/180.0;     // Camera's vertical rotation
var dr = 5.0 * Math.PI/180.0;      // How fast our camera rotates

// View frustum parameters
var left = -1.0;
var right = 1.0;
var ytop = 1.0;
var bottom = -1.0;

// Camera control variables
var eye = vec3(0.0, 1.5, 3.0);    // Camera position
var at = vec3(0.0, 0.0, 0.0);     // Look-at point
var up = vec3(0.0, 1.0, 0.0);     // Up vector
var cameraSpeed = 0.1;             // Camera movement speed
var rotationSpeed = 0.05;          // Camera rotation speed
var autoFlight = false;            // Auto-flight mode flag
var flightTime = 0;                // Time for auto-flight animation

// Camera orientation angles
var yaw = -Math.PI/2;   // Horizontal rotation (initialized to look at terrain)
var pitch = -0.3;       // Vertical rotation (initialized to look down slightly)

// Perspective settings - these control how our 3D world appears
var fovy = 60.0;        // Field of view (how wide we can see)
var aspect = 1.0;       // Screen aspect ratio

// Terrain parameters
var data = [];                      // Height map data
var TerrainHi = 0.5;               // Maximum terrain height
var WaterLevel = -0.1;             // Water level height
var terrRows = 512;                // Terrain resolution (rows)
var terrCols = 512;                // Terrain resolution (columns)
var index = 0;                     // Current vertex index

// Transformation matrices
var mvMatrix, pMatrix;             // Model-view and projection matrices
var modelView, projection;         // Uniform locations for matrices
var timeUniform;                   // Uniform location for time
var startTime;                     // Animation start time

// Tree parameters
var treePositions = [];            // Array of tree positions
var treeColors = [];               // Array of tree colors
var numTrees = 50;                 // Number of trees to generate
var treeSize = 0.15;               // Base size of trees
var treeDensityVariation = 0.7;    // Tree density variation factor

// Pebble parameters
var numPebbles = 200;              // Number of pebbles
var minPebbleSize = 0.04;          // Minimum pebble size
var maxPebbleSize = 0.08;          // Maximum pebble size
var pebbleBaseColor = vec4(0.5, 0.5, 0.5, 1.0);  // Base color for pebbles

// Update camera direction based on yaw and pitch angles
function updateCameraDirection() {
    // Calculate new direction vector from angles
    var direction = vec3(
        Math.cos(pitch) * Math.sin(yaw),
        Math.sin(pitch),
        Math.cos(pitch) * Math.cos(yaw)
    );
    
    // Update look-at point based on new direction
    at = add(eye, direction);
}

// Generate terrain height data using trigonometric functions
function genTerrainData(rows, cols) {
    var xinc = 4/rows;
    var zinc = 4/cols;
    
    var x = -2;
    for(let i = 0; i < rows; x += xinc, i++) {
        data[i] = new Array(cols);
        var z = -2;
        for(let j = 0; j < cols; z += zinc, j++) {
            // Combine multiple frequencies for natural-looking terrain
            var height = Math.sin(2*Math.PI*x/4) * Math.cos(2*Math.PI*z/4) * TerrainHi * 0.7;
            height += Math.sin(4*Math.PI*x/4) * Math.cos(4*Math.PI*z/4) * TerrainHi * 0.1;
            height += Math.sin(8*Math.PI*x/4) * Math.cos(8*Math.PI*z/4) * TerrainHi * 0.1;
            
            // Ensure minimum height difference from water level
            if (height > WaterLevel && height < WaterLevel + 0.05) {
                height = WaterLevel + 0.05;
            }
            if (height < WaterLevel && height > WaterLevel - 0.05) {
                height = WaterLevel - 0.05;
            }
            
            data[i][j] = height;
        }
    }
    
    // Smooth the terrain to remove sharp edges
    smoothTerrain(rows, cols);
}

// Smooth terrain using a simple averaging filter
function smoothTerrain(rows, cols) {
    // Create a single copy of the terrain data for smoothing
    var smoothed = new Array(rows);
    for(var i = 0; i < rows; i++) {
        smoothed[i] = new Array(cols);
        for(var j = 0; j < cols; j++) {
            // Apply 3x3 smoothing kernel for each point
            var sum = 0;
            var count = 0;
            
            // Average with neighboring points
            for(var di = -1; di <= 1; di++) {
                for(var dj = -1; dj <= 1; dj++) {
                    var ni = i + di;
                    var nj = j + dj;
                    if(ni >= 0 && ni < rows && nj >= 0 && nj < cols) {
                        sum += data[ni][nj];
                        count++;
                    }
                }
            }
            smoothed[i][j] = sum / count;
        }
    }
    
    // Copy smoothed data back to original array
    for(var i = 0; i < rows; i++) {
        for(var j = 0; j < cols; j++) {
            data[i][j] = smoothed[i][j];
        }
    }
}

// Generate a cube with specified parameters
function generateCube(centerX, centerY, centerZ, width, height, depth, color) {
    var halfWidth = width / 2;
    var halfHeight = height / 2;
    var halfDepth = depth / 2;
    
    // Define the 8 vertices of the cube
    var cubeVertices = [
        // Front face vertices
        vec4(centerX - halfWidth, centerY - halfHeight, centerZ + halfDepth, 1.0),  // 0
        vec4(centerX + halfWidth, centerY - halfHeight, centerZ + halfDepth, 1.0),  // 1
        vec4(centerX + halfWidth, centerY + halfHeight, centerZ + halfDepth, 1.0),  // 2
        vec4(centerX - halfWidth, centerY + halfHeight, centerZ + halfDepth, 1.0),  // 3
        // Back face vertices
        vec4(centerX - halfWidth, centerY - halfHeight, centerZ - halfDepth, 1.0),  // 4
        vec4(centerX + halfWidth, centerY - halfHeight, centerZ - halfDepth, 1.0),  // 5
        vec4(centerX + halfWidth, centerY + halfHeight, centerZ - halfDepth, 1.0),  // 6
        vec4(centerX - halfWidth, centerY + halfHeight, centerZ - halfDepth, 1.0)   // 7
    ];
    
    // Define indices for each face (using triangles)
    var indices = [
        // Front face
        0, 1, 2,
        0, 2, 3,
        // Back face
        5, 4, 7,
        5, 7, 6,
        // Right face
        1, 5, 6,
        1, 6, 2,
        // Left face
        4, 0, 3,
        4, 3, 7,
        // Top face
        3, 2, 6,
        3, 6, 7,
        // Bottom face
        4, 5, 1,
        4, 1, 0
    ];
    
    // Add vertices using the indices
    for(var i = 0; i < indices.length; i++) {
        pointsArray.push(cubeVertices[indices[i]]);
        colorsArray.push(color);
    }
    
    return indices.length;  // Return number of vertices added
}

// Create a tree at specified position
function createTree(baseX, baseY, baseZ, size) {
    // Calculate tree dimensions
    var trunkHeight = size * 0.8 + (4 * size * 0.35);
    var trunkWidth = size * 0.2;
    
    // Generate random colors for tree
    var trunkColor = vec4(
        0.3 + Math.random() * 0.2,  // Brown base (0.3-0.5)
        0.1 + Math.random() * 0.1,  // Slight green tint (0.1-0.2)
        0.0 + Math.random() * 0.1,  // Slight blue tint (0.0-0.1)
        1.0
    );
    
    var foliageColor = vec4(
        0.0,  // No red
        0.4 + Math.random() * 0.3,  // Green (0.4-0.7)
        0.0 + Math.random() * 0.1,  // Slight blue tint (0.0-0.1)
        1.0
    );
    
    // Create trunk using our generalized cube function
    generateCube(
        baseX,                    // centerX
        baseY + trunkHeight/2,    // centerY
        baseZ,                    // centerZ
        trunkWidth * 2,           // width
        trunkHeight,              // height
        trunkWidth * 2,           // depth
        trunkColor                // color
    );
    
    // Create foliage layers
    var layers = 5;
    for(var layer = 0; layer < layers; layer++) {
        var layerSize = size * (1.0 - layer * 0.15);
        var layerHeight = baseY + (size * 0.8) + layer * size * 0.35;
        var topPoint = vec4(baseX, layerHeight + size * 0.25, baseZ, 1.0);
        
        // Create multiple triangles for each layer
        var numTriangles = 8;
        for(var t = 0; t < numTriangles; t++) {
            var angle = (t * 2.0 * Math.PI) / numTriangles;
            var nextAngle = ((t + 1) * 2.0 * Math.PI) / numTriangles;
            
            // Calculate points for this triangle
            var p1 = vec4(
                baseX + Math.cos(angle) * layerSize,
                layerHeight,
                baseZ + Math.sin(angle) * layerSize,
                1.0
            );
            var p2 = vec4(
                baseX + Math.cos(nextAngle) * layerSize,
                layerHeight,
                baseZ + Math.sin(nextAngle) * layerSize,
                1.0
            );
            
            // Add triangle vertices
            pointsArray.push(p1);
            pointsArray.push(topPoint);
            pointsArray.push(p2);
            
            // Add foliage color
            for(var i = 0; i < 3; i++) {
                colorsArray.push(foliageColor);
            }
        }
    }
}

// Place trees on the terrain
function placeTrees() {
    for(var i = 0; i < numTrees; i++) {
        // Generate random position
        var row = Math.floor(Math.random() * (terrRows - 2)) + 1;
        var col = Math.floor(Math.random() * (terrCols - 2)) + 1;
        
        var x = 4 * row/terrRows - 2;
        var z = 4 * col/terrCols - 2;
        var y = data[row][col];
        
        // Only place trees above water level
        if(y > WaterLevel) {
            // Vary tree density based on height
            var heightFactor = (y - WaterLevel) / (TerrainHi - WaterLevel);
            if(Math.random() < (heightFactor * treeDensityVariation + 0.3)) {
                var size = treeSize * (0.8 + Math.random() * 0.4);
                createTree(x, y, z, size);
            }
        }
    }
}

// Create a pebble at specified position
function createPebble(x, y, z) {
    // Generate random size variations
    var sizeVariation = Math.random() * (maxPebbleSize - minPebbleSize) + minPebbleSize;
    var width = sizeVariation * (0.8 + Math.random() * 0.4);
    var height = sizeVariation * (0.4 + Math.random() * 0.3);
    var depth = sizeVariation * (0.8 + Math.random() * 0.4);
    
    // Generate random color variations
    var colorVariation = -0.15 + Math.random() * 0.3;
    var pebbleColor = vec4(
        pebbleBaseColor[0] + colorVariation,
        pebbleBaseColor[1] + colorVariation,
        pebbleBaseColor[2] + colorVariation,
        1.0
    );
    
    // Create the pebble
    return generateCube(x, y + height/2, z, width, height, depth, pebbleColor);
}

// Place pebbles on the terrain
function placePebbles() {
    for(var i = 0; i < numPebbles; i++) {
        // Generate random position
        var row = Math.floor(Math.random() * (terrRows - 2)) + 1;
        var col = Math.floor(Math.random() * (terrCols - 2)) + 1;
        
        var x = 4 * row/terrRows - 2;
        var z = 4 * col/terrCols - 2;
        var y = data[row][col];
        
        // Only place pebbles above water level and not too high
        if(y > WaterLevel && y < TerrainHi * 0.8) {
            // More pebbles in lower areas
            var heightFactor = 1.0 - ((y - WaterLevel) / (TerrainHi - WaterLevel));
            if(Math.random() < heightFactor * 0.9) {
                createPebble(x, y, z);
            }
        }
    }
}

// Create a house at specified position
function createHouse(baseX, baseY, baseZ) {
    // House dimensions
    var houseWidth = 0.3;
    var houseHeight = 0.25;
    var houseDepth = 0.3;
    var roofHeight = 0.15;
    
    // Create house walls using our generalized cube function
    var wallColor = vec4(0.8, 0.7, 0.6, 1.0); // Light brown
    generateCube(
        baseX,
        baseY + houseHeight/2,
        baseZ,
        houseWidth,
        houseHeight,
        houseDepth,
        wallColor
    );
    
    // Create roof
    var roofColor = vec4(0.5, 0.2, 0.1, 1.0); // Dark red
    var roofTop = vec4(baseX, baseY + houseHeight + roofHeight, baseZ, 1.0);
    
    // Front roof face
    var frontLeft = vec4(baseX - houseWidth/2, baseY + houseHeight, baseZ - houseDepth/2, 1.0);
    var frontRight = vec4(baseX + houseWidth/2, baseY + houseHeight, baseZ - houseDepth/2, 1.0);
    pointsArray.push(frontLeft);
    pointsArray.push(roofTop);
    pointsArray.push(frontRight);
    
    // Back roof face
    var backLeft = vec4(baseX - houseWidth/2, baseY + houseHeight, baseZ + houseDepth/2, 1.0);
    var backRight = vec4(baseX + houseWidth/2, baseY + houseHeight, baseZ + houseDepth/2, 1.0);
    pointsArray.push(backLeft);
    pointsArray.push(roofTop);
    pointsArray.push(backRight);
    
    // Left roof face
    pointsArray.push(frontLeft);
    pointsArray.push(roofTop);
    pointsArray.push(backLeft);
    
    // Right roof face
    pointsArray.push(frontRight);
    pointsArray.push(roofTop);
    pointsArray.push(backRight);
    
    // Add roof colors
    for(var i = 0; i < 12; i++) {
        colorsArray.push(roofColor);
    }
    
    // Create door and windows using our generalized cube function
    var doorColor = vec4(0.3, 0.2, 0.1, 1.0); // Dark brown
    generateCube(
        baseX,
        baseY + 0.1,
        baseZ - houseDepth/2 - 0.01,
        houseWidth * 0.3,
        houseHeight * 0.6,
        0.02,
        doorColor
    );
    
    // Create windows
    var windowColor = vec4(0.7, 0.8, 0.9, 1.0); // Light blue
    // Front windows
    generateCube(
        baseX - houseWidth/3,
        baseY + houseHeight * 0.7,
        baseZ - houseDepth/2 - 0.01,
        houseWidth * 0.2,
        houseHeight * 0.2,
        0.02,
        windowColor
    );
    generateCube(
        baseX + houseWidth/3,
        baseY + houseHeight * 0.7,
        baseZ - houseDepth/2 - 0.01,
        houseWidth * 0.2,
        houseHeight * 0.2,
        0.02,
        windowColor
    );
}

// Find a suitable location for the house
function findSuitableHouseLocation(nRows, nColumns) {
    var suitableLocations = [];
    var minHeightAboveWater = 0.1;
    var edgeBuffer = 0.5; // Buffer from terrain edges
    
    // Define terrain bounds
    var minX = -2.0 + edgeBuffer;
    var maxX = 2.0 - edgeBuffer;
    var minZ = -2.0 + edgeBuffer;
    var maxZ = 2.0 - edgeBuffer;
    
    // Find all locations above water level with sufficient height
    for (var i = 0; i < nRows; ++i) {
        for (var j = 0; j < nColumns; ++j) {
            var x = 4*i/nRows-2;
            var z = 4*j/nColumns-2;
            
            // Check if within bounds
            if (x < minX || x > maxX || z < minZ || z > maxZ) {
                continue;
            }
            
            var height = data[i][j];
            if (height > WaterLevel + minHeightAboveWater) {
                // Check surrounding area to ensure it's not too close to water
                var isSuitable = true;
                for (var di = -1; di <= 1; di++) {
                    for (var dj = -1; dj <= 1; dj++) {
                        var ni = i + di;
                        var nj = j + dj;
                        if (ni >= 0 && ni < nRows && nj >= 0 && nj < nColumns) {
                            if (data[ni][nj] <= WaterLevel) {
                                isSuitable = false;
                                break;
                            }
                        }
                    }
                    if (!isSuitable) break;
                }
                
                if (isSuitable) {
                    suitableLocations.push({
                        x: x,
                        z: z,
                        height: height
                    });
                }
            }
        }
    }
    
    // Pick a random suitable location
    if (suitableLocations.length > 0) {
        var randomIndex = Math.floor(Math.random() * suitableLocations.length);
        return suitableLocations[randomIndex];
    }
    
    // Fallback to center if no suitable location found
    return {
        x: 0,
        z: 0,
        height: WaterLevel + minHeightAboveWater
    };
}

// Prepare the mesh for rendering
function prepMesh(nRows, nColumns) {
    // Clear arrays before generating new data
    pointsArray = [];
    colorsArray = [];
    index = 0;
    
    // Find a random suitable location for the house
    var houseLocation = findSuitableHouseLocation(nRows, nColumns);
    
    // Generate terrain vertices
    for (var i = 0; i < nRows; ++i) {
        for (var j = 0; j < nColumns; ++j) {
            var height = data[i][j];
            var color;
            
            // Set color based on height
            if (height <= WaterLevel) {
                color = vec4(0.0, 0.3, 0.8, 1.0);  // Water color
                height = WaterLevel;
            } else {
                // Terrain color varies with height
                var normalizedHeight = (height - WaterLevel) / (TerrainHi - WaterLevel);
                color = vec4(
                    0.35 + normalizedHeight * 0.3,
                    0.5 + normalizedHeight * 0.2,
                    0.15 + normalizedHeight * 0.1,
                    1.0
                );
            }
            
            // Add vertex
            pointsArray[index] = vec4(4*i/nRows-2, height, 4*j/nColumns-2, 1.0);
            colorsArray[index] = color;
            index++;
        }
    }
    
    // Create grid lines
    for (var j = 0; j < nColumns; ++j) {
        for (var i = 0; i < nRows; ++i) {
            var height = data[i][j];
            if (height <= WaterLevel) {
                height = WaterLevel;
            }
            pointsArray[index] = vec4(4*i/nRows-2, height, 4*j/nColumns-2, 1.0);
            colorsArray[index] = vec4(0.2, 0.2, 0.2, 1.0);
            index++;
        }
    }
    
    // Add trees, pebbles, and house
    placeTrees();
    placePebbles();
    createHouse(houseLocation.x, houseLocation.height, houseLocation.z);
}

// Handle keyboard input for camera movement
function handleKeyDown(event) {
    // Handle space bar for auto-flight toggle
    if (event.key === ' ') {
        if (autoFlight) {
            // Store current orientation when pausing auto-flight
            var direction = subtract(at, eye);
            direction = normalize(direction);
            yaw = Math.atan2(direction[0], direction[2]);
            pitch = Math.asin(direction[1]);
        }
        autoFlight = !autoFlight;
        return;
    }

    // Skip camera controls if in auto-flight mode
    if (autoFlight) return;

    // Calculate movement vectors
    var forward = subtract(at, eye);
    forward[1] = 0;  // Keep forward movement level with ground
    forward = normalize(forward);
    var right = normalize(cross(forward, up));
    var moveAmount = cameraSpeed;

    // Handle movement keys
    switch(event.key.toLowerCase()) {
        case 'w': // Forward
            eye = add(eye, scale(moveAmount, forward));
            at = add(at, scale(moveAmount, forward));
            break;
        case 's': // Backward
            eye = subtract(eye, scale(moveAmount, forward));
            at = subtract(at, scale(moveAmount, forward));
            break;
        case 'a': // Left
            eye = subtract(eye, scale(moveAmount, right));
            at = subtract(at, scale(moveAmount, right));
            break;
        case 'd': // Right
            eye = add(eye, scale(moveAmount, right));
            at = add(at, scale(moveAmount, right));
            break;
        case 'q': // Up
            eye[1] += moveAmount;
            at[1] += moveAmount;
            break;
        case 'e': // Down
            eye[1] -= moveAmount;
            at[1] -= moveAmount;
            break;
        case 'arrowleft': // Rotate left
            yaw += rotationSpeed;
            updateCameraDirection();
            break;
        case 'arrowright': // Rotate right
            yaw -= rotationSpeed;
            updateCameraDirection();
            break;
        case 'arrowup': // Look up
            pitch = Math.min(pitch + rotationSpeed, Math.PI/2 - 0.1);
            updateCameraDirection();
            break;
        case 'arrowdown': // Look down
            pitch = Math.max(pitch - rotationSpeed, -Math.PI/2 + 0.1);
            updateCameraDirection();
            break;
    }
}

// Initialize the WebGL context and scene
window.onload = function init() {
    // Get canvas and WebGL context
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }
    
    // Set up viewport and clear color
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.7, 0.8, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    
    // Initialize shaders
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);
    
    // Get uniform locations
    timeUniform = gl.getUniformLocation(program, "time");
    modelView = gl.getUniformLocation(program, "modelView");
    projection = gl.getUniformLocation(program, "projection");
    
    // Set up tree trunk uniforms
    var trunkWidthUniform = gl.getUniformLocation(program, "trunkWidth");
    var baseYUniform = gl.getUniformLocation(program, "baseY");
    gl.uniform1f(trunkWidthUniform, treeSize * 0.2);
    gl.uniform1f(baseYUniform, -0.1);
    
    // Initialize time
    startTime = Date.now();
    
    // Generate and prepare terrain
    genTerrainData(terrRows, terrCols);
    prepMesh(terrRows, terrCols);
    
    // Set up color buffer
    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW);
    
    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
    
    // Set up vertex buffer
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    // Add keyboard event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Initialize auto-flight
    autoFlight = true;
    flightTime = 0;
    updateAutoFlight();
    updateCameraDirection();
    
    // Start rendering loop
    render();
}

// Update auto-flight camera position
function updateAutoFlight() {
    if (autoFlight) {
        flightTime += 0.01;
    }

    // Calculate circular orbit
    var orbitRadius = 4.0;
    var orbitHeight = 2.0;

    eye = vec3(
        orbitRadius * Math.cos(flightTime),
        orbitHeight,
        orbitRadius * Math.sin(flightTime)
    );

    at = vec3(0, 0, 0);
    up = vec3(0.0, 1.0, 0.0);
}

// Main rendering function
var render = function() {
    // Clear buffers
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // Update time uniform for animations
    var currentTime = (Date.now() - startTime) / 1000.0;
    gl.uniform1f(timeUniform, currentTime);
    
    // Update auto-flight if enabled
    if (autoFlight) {
        updateAutoFlight();
    }
    
    // Update transformation matrices
    mvMatrix = lookAt(eye, at, up);
    pMatrix = perspective(fovy, aspect, near, far);
    
    // Set uniform matrices
    gl.uniformMatrix4fv(modelView, false, flatten(mvMatrix));
    gl.uniformMatrix4fv(projection, false, flatten(pMatrix));
    
    // Draw terrain grid
    for (var i = 0; i < terrRows; ++i) {
        gl.drawArrays(gl.LINE_STRIP, i*terrCols, terrCols);
    }
    for (var i = 0; i < terrCols; ++i) {
        gl.drawArrays(gl.LINE_STRIP, i*terrRows+(index/2), terrRows);
    }
    
    // Draw trees and pebbles
    var objectStartIndex = terrRows * terrCols + (terrRows * terrCols);
    var verticesPerTrunk = 36;
    var verticesPerFoliage = 3 * 12;
    var verticesPerTree = verticesPerTrunk + verticesPerFoliage;
    var verticesPerPebble = 36;
    
    // Draw trees
    for(var i = 0; i < numTrees; i++) {
        var treeStart = objectStartIndex + (i * verticesPerTree);
        gl.drawArrays(gl.TRIANGLES, treeStart, verticesPerTrunk);
        gl.drawArrays(gl.TRIANGLES, treeStart + verticesPerTrunk, verticesPerFoliage);
    }
    
    // Draw pebbles
    var pebblesStartIndex = objectStartIndex + (numTrees * verticesPerTree);
    for(var i = 0; i < numPebbles; i++) {
        gl.drawArrays(gl.TRIANGLES, pebblesStartIndex + (i * verticesPerPebble), verticesPerPebble);
    }
    
    // Request next frame
    requestAnimFrame(render);
}

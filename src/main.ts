import { VisualizationScene } from './visualization';
import { Vector3, Matrix3x3 } from './mathTypes';

// State variables
let rawScene: VisualizationScene | null = null;
let extractedScene: VisualizationScene | null = null;

// DOM element references
const alphaElement = document.getElementById('alpha')!;
const betaElement = document.getElementById('beta')!;
const gammaElement = document.getElementById('gamma')!;
const headingElement = document.getElementById('heading')!;
const elevationElement = document.getElementById('elevation')!;
const rollElement = document.getElementById('roll')!;
const directionElement = document.getElementById('direction')!;
const requestButton = document.getElementById('requestButton')!;
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

// Format number to 1 decimal place
function formatValue(value: number | null): string {
    if (value === null || value === undefined) {
        return '--';
    }
    return value.toFixed(1);
}

// Get compass direction from heading
function getCompassDirection(heading: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(heading / 45) % 8;
    return directions[index];
}

// Normalize heading to [-180, +180] range
// Converts heading from 0-360° to -180° to +180° range
function normalizeHeadingRange(heading: number): number {
    // Convert from 0-360 to -180 to +180
    if (heading > 180) {
        heading -= 360;
    }
    return heading;
}

// Dot product: takes two vectors and returns the sum of component-wise multiplication
function dotProduct(v1: Vector3, v2: Vector3): number {
    return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
}

// Matrix-vector multiplication: result = matrix × vector
// Each component of the result is the dot product of the corresponding matrix row with the vector
function multiplyMatrixVector(matrix: Matrix3x3, vector: Vector3): Vector3 {
    return [
        dotProduct(matrix[0], vector),
        dotProduct(matrix[1], vector),
        dotProduct(matrix[2], vector),
    ];
}

// Build the rotation matrix from Euler angles (alpha, beta, gamma)
// Based on the W3C Device Orientation Event specification
// https://www.w3.org/TR/orientation-event/#worked-example
// https://www.w3.org/TR/orientation-event/equation13a.png
function buildRotationMatrix(alphaRad: number, betaRad: number, gammaRad: number): Matrix3x3 {
    const cA = Math.cos(alphaRad);
    const sA = Math.sin(alphaRad);
    const cB = Math.cos(betaRad);
    const sB = Math.sin(betaRad);
    const cG = Math.cos(gammaRad);
    const sG = Math.sin(gammaRad);

    // Full rotation matrix R from equation13a.png
    return [
        [cA*cG - sA*sB*sG,  -cB*sA,        cG*sA*sB + cA*sG],
        [cG*sA + cA*sB*sG,   cA*cB,        sA*sG - cA*cG*sB],
        [-cB*sG,             sB,            cB*cG          ],
    ];
}

// Calculate orientation angles (heading, elevation, roll) from transformed vectors
// This unified function ensures all three angles are interdependent and maintain proper ranges:
// - heading: 0-360° (compass direction)
// - elevation: -90° to +90° (pitch, angle from horizontal)
// - roll: -180° to +180° (bank, rotation around forward axis)
// 
// Input:
//   - northVector: transformed north vector [0, 0, -1] from rotation matrix
//   - eastVector: transformed east vector [1, 0, 0] from rotation matrix
// 
// Output: {heading, elevation, roll}
function calculateOrientationAngles(northVector: Vector3, eastVector: Vector3): {heading: number, elevation: number, roll: number} {
    // === HEADING (from north vector) ===
    // Project north vector onto horizontal plane (x-y plane)
    // Heading = atan2(x, y) gives compass direction
    const headingX = northVector[0];
    const headingY = northVector[1];
    let heading = Math.atan2(headingX, headingY) * (180 / Math.PI);
    if (heading < 0) {
        heading += 360;
    }

    // === ELEVATION (from north vector) ===
    // Elevation is the angle from the horizontal plane
    // Use the magnitude of horizontal components as the "adjacent" side
    const elevationZ = northVector[2];
    const horizontalDist = Math.sqrt(northVector[0] ** 2 + northVector[1] ** 2);
    const elevation = Math.atan2(elevationZ, horizontalDist) * (180 / Math.PI);

    // === ROLL (from east vector) ===
    // Roll is the bank angle around the forward axis (pitch axis)
    // The horizontal distance of the east vector tells us the bank angle
    const rollZ = eastVector[2];
    const rollHorizontalDist = Math.sqrt(eastVector[0] ** 2 + eastVector[1] ** 2);
    const roll = Math.atan2(-rollZ, rollHorizontalDist) * (180 / Math.PI);

    return {heading, elevation, roll};
}

// Build rotation matrix from extracted angles (roll, elevation, heading)
// Order: R = R(roll) * R(elevation) * R(heading)
// This constructs a rotation matrix from the extracted angles to compare with the raw device matrix
function buildRotationMatrixFromAngles(heading: number, elevation: number, roll: number): Matrix3x3 {
    // Convert degrees to radians
    const h = heading * (Math.PI / 180);
    const e = elevation * (Math.PI / 180);
    const r = roll * (Math.PI / 180);

    // Heading rotation (around Z-axis)
    const ch = Math.cos(h);
    const sh = Math.sin(h);
    const Rh: Matrix3x3 = [
        [ch, -sh, 0],
        [sh, ch, 0],
        [0, 0, 1]
    ];

    // Elevation rotation (around Y-axis)
    const ce = Math.cos(e);
    const se = Math.sin(e);
    const Re: Matrix3x3 = [
        [ce, 0, se],
        [0, 1, 0],
        [-se, 0, ce]
    ];

    // Roll rotation (around X-axis)
    const cr = Math.cos(r);
    const sr = Math.sin(r);
    const Rr: Matrix3x3 = [
        [1, 0, 0],
        [0, cr, -sr],
        [0, sr, cr]
    ];

    // Multiply matrices: R = Rr * Re * Rh
    // First multiply Re * Rh
    const ReRh: Matrix3x3 = multiplyMatrices(Re, Rh);
    // Then multiply Rr * (Re * Rh)
    const R: Matrix3x3 = multiplyMatrices(Rr, ReRh);

    return R;
}

// Matrix multiplication: result = A × B
function multiplyMatrices(A: Matrix3x3, B: Matrix3x3): Matrix3x3 {
    const result: Matrix3x3 = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
    ];

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            result[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j];
        }
    }

    return result;
}

// Handle device orientation event
function handleOrientation(event: DeviceOrientationEvent): void {
    const alpha = event.alpha;
    const beta = event.beta;
    const gamma = event.gamma;

    // Update Euler angles display
    alphaElement.textContent = formatValue(alpha);
    betaElement.textContent = formatValue(beta);
    gammaElement.textContent = formatValue(gamma);

    // Calculate and display heading, elevation, and roll
    if (alpha !== null && beta !== null && gamma !== null) {
        // Convert degrees to radians once
        const alphaRad = alpha * (Math.PI / 180);
        const betaRad = beta * (Math.PI / 180);
        const gammaRad = gamma * (Math.PI / 180);

        // Build rotation matrix once
        const R = buildRotationMatrix(alphaRad, betaRad, gammaRad);

        // Transform vectors once
        const northVector = multiplyMatrixVector(R, [0, 0, -1]);
        const eastVector = multiplyMatrixVector(R, [1, 0, 0]);

        // Calculate angles from transformed vectors using unified function
        const angles = calculateOrientationAngles(northVector, eastVector);
        
        // Normalize heading to [-180, +180] range
        const normalizedHeading = normalizeHeadingRange(angles.heading);
        
        if (!isNaN(normalizedHeading)) {
            headingElement.textContent = formatValue(normalizedHeading) + '°';
            directionElement.textContent = getCompassDirection(angles.heading);
        } else {
            headingElement.textContent = '--';
            directionElement.textContent = 'Tilt device';
        }
        
        if (!isNaN(angles.elevation)) {
            elevationElement.textContent = formatValue(angles.elevation) + '°';
        } else {
            elevationElement.textContent = '--';
        }
        
        if (!isNaN(angles.roll)) {
            rollElement.textContent = formatValue(angles.roll) + '°';
        } else {
            rollElement.textContent = '--';
        }

        // Update 3D visualizations if they exist
        if (rawScene && extractedScene) {
            // Update raw device matrix scene
            rawScene.updateRotation(R);

            // Build rotation matrix from extracted angles and update extracted angles scene
            const extractedMatrix = buildRotationMatrixFromAngles(angles.heading, angles.elevation, angles.roll);
            extractedScene.updateRotation(extractedMatrix);
        }
    }
}

// Request permission (required for iOS 13+)
async function requestPermission(): Promise<void> {
    try {
        // Check if permission request is needed (iOS 13+)
        if (typeof DeviceOrientationEvent !== 'undefined' && 
            'requestPermission' in DeviceOrientationEvent && 
            typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            
            requestButton.setAttribute('disabled', 'true');
            requestButton.textContent = 'Requesting permission...';
            
            const permission = await (DeviceOrientationEvent as any).requestPermission();
            
            if (permission === 'granted') {
                startListening();
            } else {
                requestButton.textContent = 'Permission Denied - Enable in Settings';
                requestButton.removeAttribute('disabled');
            }
        } else {
            // For non-iOS or older iOS devices
            startListening();
        }
    } catch (error) {
        console.error('Error requesting permission:', error);
        requestButton.textContent = 'Error - Try Again';
        requestButton.removeAttribute('disabled');
    }
}

// Start listening to device orientation
function startListening(): void {
    if (typeof DeviceOrientationEvent === 'undefined') {
        requestButton.textContent = 'Device Orientation Not Supported';
        return;
    }

    window.addEventListener('deviceorientation', handleOrientation);
    requestButton.style.display = 'none';
}

// Initialize 3D scenes
function initialize3DScenes(): void {
    const rawCanvas = document.getElementById('canvas-raw') as HTMLCanvasElement;
    const extractedCanvas = document.getElementById('canvas-extracted') as HTMLCanvasElement;

    if (rawCanvas && extractedCanvas) {
        rawScene = new VisualizationScene(rawCanvas);
        extractedScene = new VisualizationScene(extractedCanvas);

        // Handle window resize
        window.addEventListener('resize', () => {
            rawScene?.resize();
            extractedScene?.resize();
        });
    }
}

// Handle tab switching
function switchTab(tabName: string): void {
    // Update tab buttons
    tabButtons.forEach(button => {
        if (button.getAttribute('data-tab') === tabName) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });

    // Update tab contents
    tabContents.forEach(content => {
        if (content.id === `tab-${tabName}`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });

    // Initialize 3D scenes when visualization tab is first opened
    if (tabName === 'visualization' && !rawScene && !extractedScene) {
        initialize3DScenes();
    }

    // Trigger resize when switching to visualization tab
    if (tabName === 'visualization') {
        setTimeout(() => {
            rawScene?.resize();
            extractedScene?.resize();
        }, 100);
    }
}

// Check if device orientation is supported on page load
function initializeApp(): void {
    if (typeof DeviceOrientationEvent === 'undefined') {
        requestButton.textContent = 'Device Orientation Not Supported';
        requestButton.setAttribute('disabled', 'true');
    }

    // Add event listeners
    requestButton.addEventListener('click', requestPermission);

    // Add tab switching event listeners
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            if (tabName) {
                switchTab(tabName);
            }
        });
    });
}

// Initialize the app when DOM is loaded
window.addEventListener('load', initializeApp);
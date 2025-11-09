import { VisualizationScene } from './visualization';
import { Vector3, multiplyMatrixVector, buildRotationMatrix, buildRotationMatrixFromAngles } from './mathTypes';

// State variables
let deviceScene: VisualizationScene | null = null;
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
        if (deviceScene && extractedScene) {
            // Update raw device matrix scene
            deviceScene.updateRotation(R);

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
        // view the sensor scene from a similar perspective the chrome dev tools simulator uses
        deviceScene = new VisualizationScene(rawCanvas, [0, -5, 0]);

        // view the virtual scene from behind the origin, looking toward it
        extractedScene = new VisualizationScene(extractedCanvas, [0, 0, 5]);

        // Handle window resize
        window.addEventListener('resize', () => {
            deviceScene?.resize();
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
    if (tabName === 'visualization' && !deviceScene && !extractedScene) {
        initialize3DScenes();
    }

    // Trigger resize when switching to visualization tab
    if (tabName === 'visualization') {
        setTimeout(() => {
            deviceScene?.resize();
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
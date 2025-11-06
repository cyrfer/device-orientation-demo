// State variables
let permissionGranted = false;
let normalizeHeading = true; // Default to normalized range
let useLinearAlgebra = true; // Use linear algebra implementation (true) or fallback (false)

// DOM element references
const alphaElement = document.getElementById('alpha')!;
const betaElement = document.getElementById('beta')!;
const gammaElement = document.getElementById('gamma')!;
const headingElement = document.getElementById('heading')!;
const directionElement = document.getElementById('direction')!;
const requestButton = document.getElementById('requestButton')!;
const statusElement = document.getElementById('status')!;
const normalizeToggle = document.getElementById('normalizeToggle') as HTMLInputElement;
const linearAlgebraToggle = document.getElementById('linearAlgebraToggle') as HTMLInputElement;

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

// Type definitions for linear algebra
type Vector3 = [number, number, number];
type Matrix3x3 = [Vector3, Vector3, Vector3];

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

// Fallback implementation using the original W3C worked example approach
// Input: Euler angles in radians
// Output: Transformed vector components as [x, y, z]
function compassHeadingFallback(alphaRad: number, betaRad: number, gammaRad: number): Vector3 {
    const cA = Math.cos(alphaRad);
    const sA = Math.sin(alphaRad);
    const sB = Math.sin(betaRad);
    const cG = Math.cos(gammaRad);
    const sG = Math.sin(gammaRad);

    // Calculate transformed vector components directly from the W3C worked example
    const rA = -cA * sG - sA * sB * cG;
    const rB = -sA * sG + cA * sB * cG;

    return [rA, rB, 0]; // Third component not used in heading calculation
}

// New implementation using explicit linear algebra
// Input: Euler angles in radians
// Output: Transformed vector components as [x, y, z]
function compassHeadingLinearAlgebra(alphaRad: number, betaRad: number, gammaRad: number): Vector3 {
    // Build the rotation matrix
    const R = buildRotationMatrix(alphaRad, betaRad, gammaRad);

    // Input vector: magnetic north in device coordinates
    // Using [0, 0, -1] based on W3C equation5e.png showing negation of third column
    const v: Vector3 = [0, 0, -1];

    // Transform the vector: v' = R × v
    const vPrime = multiplyMatrixVector(R, v);

    return vPrime;
}

// Calculate compass heading from transformed vector components
// Uses atan2 for proper quadrant handling
function getHeadingFromVector(transformedVector: Vector3): number {
    const x = transformedVector[0];
    const y = transformedVector[1];

    // Calculate heading using atan2 for proper angle calculation across all quadrants
    let heading = Math.atan2(x, y) * (180 / Math.PI);

    // Normalize to 0-360 range
    if (heading < 0) {
        heading += 360;
    }

    return heading;
}

// Main compass heading calculation function
// Uses the selected implementation (linear algebra or fallback)
function compassHeading(alpha: number, beta: number, gamma: number): number {
    // Convert degrees to radians once
    const alphaRad = alpha * (Math.PI / 180);
    const betaRad = beta * (Math.PI / 180);
    const gammaRad = gamma * (Math.PI / 180);

    const transformedVector = useLinearAlgebra
        ? compassHeadingLinearAlgebra(alphaRad, betaRad, gammaRad)
        : compassHeadingFallback(alphaRad, betaRad, gammaRad);
    return getHeadingFromVector(transformedVector);
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

    // Calculate and display compass heading
    if (alpha !== null && beta !== null && gamma !== null) {
        const heading = compassHeading(alpha, beta, gamma);
        if (!isNaN(heading)) {
            // Apply normalization if toggle is enabled
            let displayHeading = heading;
            if (normalizeHeading && heading > 180) {
                displayHeading = heading - 360;
            }
            headingElement.textContent = formatValue(displayHeading) + '°';
            directionElement.textContent = getCompassDirection(heading);
        } else {
            headingElement.textContent = '--';
            directionElement.textContent = 'Tilt device';
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
            statusElement.textContent = 'Requesting permission...';
            
            const permission = await (DeviceOrientationEvent as any).requestPermission();
            
            if (permission === 'granted') {
                startListening();
            } else {
                statusElement.textContent = 'Permission denied. Please allow orientation access in settings.';
                statusElement.classList.add('error');
                requestButton.removeAttribute('disabled');
            }
        } else {
            // For non-iOS or older iOS devices
            startListening();
        }
    } catch (error) {
        console.error('Error requesting permission:', error);
        statusElement.textContent = 'Error: ' + (error as Error).message;
        statusElement.classList.add('error');
        requestButton.removeAttribute('disabled');
    }
}

// Start listening to device orientation
function startListening(): void {
    if (typeof DeviceOrientationEvent === 'undefined') {
        statusElement.textContent = 'Device orientation not supported on this device.';
        statusElement.classList.add('error');
        return;
    }

    window.addEventListener('deviceorientation', handleOrientation);
    permissionGranted = true;
    requestButton.style.display = 'none';
    statusElement.textContent = 'Listening to device orientation...';
    statusElement.classList.remove('error');
}

// Check if device orientation is supported on page load
function initializeApp(): void {
    if (typeof DeviceOrientationEvent === 'undefined') {
        statusElement.textContent = 'Device orientation is not supported on this device/browser.';
        statusElement.classList.add('error');
        requestButton.setAttribute('disabled', 'true');
    } else if (!('requestPermission' in DeviceOrientationEvent)) {
        // Auto-start for non-iOS devices
        statusElement.textContent = 'Click the button to start monitoring device orientation.';
    }

    // Add event listeners
    requestButton.addEventListener('click', requestPermission);
    normalizeToggle.addEventListener('change', (event) => {
        normalizeHeading = (event.target as HTMLInputElement).checked;
    });
    linearAlgebraToggle.addEventListener('change', (event) => {
        useLinearAlgebra = (event.target as HTMLInputElement).checked;
    });
}

// Initialize the app when DOM is loaded
window.addEventListener('load', initializeApp);
// State variables
let permissionGranted = false;
let normalizeHeading = true; // Default to normalized range

// DOM element references
const alphaElement = document.getElementById('alpha')!;
const betaElement = document.getElementById('beta')!;
const gammaElement = document.getElementById('gamma')!;
const headingElement = document.getElementById('heading')!;
const directionElement = document.getElementById('direction')!;
const requestButton = document.getElementById('requestButton')!;
const statusElement = document.getElementById('status')!;
const normalizeToggle = document.getElementById('normalizeToggle') as HTMLInputElement;

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

// Calculate compass heading using the worked example from W3C specification
// https://www.w3.org/TR/orientation-event/#worked-example
function compassHeading(alpha: number, beta: number, gamma: number): number {
    // Convert degrees to radians
    const alphaRad = alpha * (Math.PI / 180);
    const betaRad = beta * (Math.PI / 180);
    const gammaRad = gamma * (Math.PI / 180);

    // Calculate equation components
    const cA = Math.cos(alphaRad);
    const sA = Math.sin(alphaRad);
    const sB = Math.sin(betaRad);
    const cG = Math.cos(gammaRad);
    const sG = Math.sin(gammaRad);

    // Calculate A, B rotation components
    const rA = -cA * sG - sA * sB * cG;
    const rB = -sA * sG + cA * sB * cG;

    // Calculate compass heading
    let compassHeadingValue = Math.atan(rA / rB);

    // Convert from half unit circle to whole unit circle
    if (rB < 0) {
        compassHeadingValue += Math.PI;
    } else if (rA < 0) {
        compassHeadingValue += 2 * Math.PI;
    }

    // Convert radians to degrees
    return compassHeadingValue * (180 / Math.PI);
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
}

// Initialize the app when DOM is loaded
window.addEventListener('load', initializeApp);
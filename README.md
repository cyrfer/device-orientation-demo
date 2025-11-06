# device-orientation-demo

A web application for mobile devices that demonstrates the DeviceOrientationEvent API by displaying real-time Euler angles (alpha, beta, gamma) and calculating compass heading.

## Live Demo

Visit the live demo at: https://cyrfer.github.io/device-orientation-demo/

## Features

- **Real-time Euler Angle Display**: Shows alpha (Z-axis), beta (X-axis), and gamma (Y-axis) values
- **Compass Heading Calculation & Normalization Toggle**: Implements the [W3C worked example](https://www.w3.org/TR/orientation-event/#worked-example) to calculate true compass heading, with an option to display heading in either 0°–360° or normalized -180°–+180° range
- **Mobile-Friendly Interface**: Responsive design optimized for mobile devices
- **iOS 13+ Permission Handling**: Properly requests device orientation permissions on iOS devices
- **Visual Feedback**: Clean, modern UI with real-time updates

## Usage

1. Open `index.html` in a mobile device browser (or use browser dev tools to simulate a mobile device)
2. Click "Enable Device Orientation" button
3. Grant permission when prompted (iOS devices)
4. The app will display:
   - Alpha: Rotation around Z-axis (0° to 360°)
   - Beta: Front-to-back tilt (-180° to 180°)
   - Gamma: Left-to-right tilt (-90° to 90°)
   - Compass Heading: Calculated direction in degrees and cardinal direction (N, NE, E, SE, S, SW, W, NW)
   - **Heading Range Toggle**: Use the checkbox to switch between 0°–360° and -180°–+180° display for compass heading. The normalized range is useful for applications needing signed heading values.

## Browser Compatibility

- **iOS**: Requires iOS 13+ and user permission
- **Android**: Works on Chrome, Firefox, and other modern browsers
- **Desktop**: Limited support (most desktop browsers don't have orientation sensors)

## Technical Details

The compass heading calculation uses the worked example from the [W3C Device Orientation Event Specification](https://www.w3.org/TR/orientation-event/#worked-example), which converts the device's orientation (expressed as Euler angles) into a compass heading by:

1. Converting angles to radians
2. Calculating rotation matrix components
3. Using arctangent to determine heading
4. Normalizing to 0-360 degrees

### Heading Normalization Feature
The app includes a toggle to display compass heading in either the standard 0°–360° range or a normalized -180°–+180° range. When enabled, headings greater than 180° are shown as negative values (e.g., 270° becomes -90°). This is useful for applications that require signed heading values for easier interpretation of left/right orientation.

## Local Testing

Simply open `index.html` in a web browser. For the best experience:
- Use a physical mobile device, or
- Use Chrome DevTools Device Mode with sensor emulation enabled

## Deployment

This application is automatically deployed to GitHub Pages using GitHub Actions. The workflow runs on every push to the `main` branch and can also be triggered manually from the Actions tab.

The deployment workflow:
1. Checks out the repository
2. Configures GitHub Pages settings
3. Uploads all files as a Pages artifact
4. Deploys to GitHub Pages

To enable GitHub Pages for your fork:
1. Go to your repository Settings
2. Navigate to Pages section
3. Under "Build and deployment", select "GitHub Actions" as the source

## License

MIT License - see LICENSE file for details

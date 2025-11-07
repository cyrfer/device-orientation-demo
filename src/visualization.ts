import * as THREE from 'three';
import { Matrix3x3 } from './mathTypes';

// Apply a 3x3 rotation matrix to a THREE.Matrix4
// The 3x3 matrix represents the rotation component, which is placed in the upper-left
// of the 4x4 matrix with the rest being identity (no translation, uniform scale of 1)
function setMatrix4FromMatrix3x3(matrix4: THREE.Matrix4, m: Matrix3x3): void {
    matrix4.set(
        m[0][0], m[0][1], m[0][2], 0,
        m[1][0], m[1][1], m[1][2], 0,
        m[2][0], m[2][1], m[2][2], 0,
        0,       0,       0,       1
    );
}

export class VisualizationScene {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private cube: THREE.Mesh;
    private arrowX: THREE.ArrowHelper;
    private arrowY: THREE.ArrowHelper;
    private arrowZ: THREE.ArrowHelper;
    private group: THREE.Group;

    constructor(canvas: HTMLCanvasElement) {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            75,
            canvas.clientWidth / canvas.clientHeight,
            0.1,
            1000
        );
        // Position camera directly behind the geometry along +Z axis
        this.camera.position.set(0, 0, 5);
        this.camera.lookAt(0, 0, 0);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ 
            canvas, 
            antialias: true 
        });
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Create group to hold all objects
        this.group = new THREE.Group();
        this.scene.add(this.group);

        // Create cube with distinct faces
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const materials = [
            new THREE.MeshBasicMaterial({ color: 0xff6b6b, wireframe: false }), // right - red
            new THREE.MeshBasicMaterial({ color: 0xff9999, wireframe: false }), // left - light red
            new THREE.MeshBasicMaterial({ color: 0x4ecdc4, wireframe: false }), // top - cyan
            new THREE.MeshBasicMaterial({ color: 0x95e1d3, wireframe: false }), // bottom - light cyan
            new THREE.MeshBasicMaterial({ color: 0xf7b731, wireframe: false }), // front - yellow
            new THREE.MeshBasicMaterial({ color: 0xfeca57, wireframe: false }), // back - light yellow
        ];
        this.cube = new THREE.Mesh(geometry, materials);
        
        // Add wireframe overlay to cube
        const wireframeGeometry = new THREE.EdgesGeometry(geometry);
        const wireframeMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
        const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
        this.cube.add(wireframe);
        
        this.group.add(this.cube);

        // Create axis arrows
        // X-axis (red) - points to the right in initial orientation
        this.arrowX = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0, 0, 0),
            1.5,
            0xff0000,
            0.3,
            0.2
        );
        this.group.add(this.arrowX);

        // Y-axis (green) - points up in initial orientation
        this.arrowY = new THREE.ArrowHelper(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, 0, 0),
            1.5,
            0x00ff00,
            0.3,
            0.2
        );
        this.group.add(this.arrowY);

        // Z-axis (blue) - points toward viewer in initial orientation
        this.arrowZ = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, 0),
            1.5,
            0x0000ff,
            0.3,
            0.2
        );
        this.group.add(this.arrowZ);

        // Add ambient light for better visibility
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);

        // Start animation loop
        this.animate();
    }

    private animate = (): void => {
        requestAnimationFrame(this.animate);
        this.renderer.render(this.scene, this.camera);
    };

    // Update rotation using a 3x3 rotation matrix
    public updateRotation(rotationMatrix: Matrix3x3): void {
        // Convert 3x3 matrix to THREE.Matrix4
        const matrix4 = new THREE.Matrix4();
        setMatrix4FromMatrix3x3(matrix4, rotationMatrix);

        // Apply rotation to the group
        this.group.setRotationFromMatrix(matrix4);
    }

    // Handle window resize
    public resize(): void {
        const canvas = this.renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    // Clean up resources
    public dispose(): void {
        this.renderer.dispose();
        this.cube.geometry.dispose();
        if (Array.isArray(this.cube.material)) {
            this.cube.material.forEach(mat => mat.dispose());
        }
    }
}

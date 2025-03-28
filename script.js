import * as THREE from 'three';

// Scene setup with dynamic dimensions
let CW = window.innerWidth;
let CH = window.innerHeight;

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-CW / 2, CW / 2, CH / 2, -CH / 2, 1, 1000);
camera.position.z = 10;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(CW, CH);
document.body.appendChild(renderer.domElement);

// Text measurement function
const measureText = (ctx, text, fontSize, fontFamily) => {
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    const metrics = ctx.measureText(text);
    return {
        width: metrics.width,
        height: fontSize
    };
};

// Create text texture
const createTextTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = CW;
    canvas.height = CH;
    const ctx = canvas.getContext('2d');
    
    // Clear and draw text
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, CW, CH);
    
    // Calculate font size based on both width and height, with maximum limit
    const fontSize = Math.min(
        Math.min(CW / 6, CH / 4), // Base size on both dimensions
        120 // Maximum font size in pixels
    );
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    
    const text = 'zeo.lol';
    const textMetrics = measureText(ctx, text, fontSize, 'Arial');
    
    ctx.fillText(text, CW / 2, CH / 2);
    
    return {
        canvas,
        ctx,
        textBounds: {
            width: textMetrics.width,
            height: textMetrics.height,
            x: CW / 2 - textMetrics.width / 2,
            y: CH / 2 - textMetrics.height / 2
        }
    };
};

let { canvas, ctx, textBounds } = createTextTexture();

// Create plane with text texture
const texture = new THREE.CanvasTexture(canvas);
const planeGeometry = new THREE.PlaneGeometry(CW, CH);
const planeMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending
});
const textPlane = new THREE.Mesh(planeGeometry, planeMaterial);
scene.add(textPlane);

// Generate point positions from text
const generatePointPositions = () => {
    const imageData = ctx.getImageData(0, 0, CW, CH);
    const data = imageData.data;
    const pointPositions = [];
    for (let j = 0; j < CH; j++) {
        for (let i = 0; i < CW; i++) {
            const index = 4 * (j * CW + i);
            if (data[index + 3] > 0 && data[index] > 0) {
                const x = i - CW / 2;
                const y = CH / 2 - j;
                pointPositions.push({ x, y, z: 0.1 });
            }
        }
    }
    return pointPositions;
};

let pointPositions = generatePointPositions();

// Point cloud setup
let geometry = new THREE.BufferGeometry();
const setupPointCloud = () => {
    const positions = new Float32Array(pointPositions.length * 3);
    const originalPositions = new Float32Array(pointPositions.length * 3);
    for (let i = 0; i < pointPositions.length; i++) {
        positions[i * 3] = pointPositions[i].x;
        positions[i * 3 + 1] = pointPositions[i].y;
        positions[i * 3 + 2] = pointPositions[i].z;
        originalPositions[i * 3] = pointPositions[i].x;
        originalPositions[i * 3 + 1] = pointPositions[i].y;
        originalPositions[i * 3 + 2] = pointPositions[i].z;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('originalPosition', new THREE.BufferAttribute(originalPositions, 3));
};

setupPointCloud();

const material = new THREE.PointsMaterial({
    size: 3,
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    alphaTest: 0.001,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending
});

const points = new THREE.Points(geometry, material);
textPlane.renderOrder = 1;
points.renderOrder = 2;
scene.add(points);

// Mouse handling
const mouse = new THREE.Vector2();
let mouseWorldX = 0;
let mouseWorldY = 0;

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / CW) * 2 - 1;
    mouse.y = -(event.clientY / CH) * 2 + 1;
    mouseWorldX = mouse.x * (CW / 2);
    mouseWorldY = mouse.y * (CH / 2);
});

// Animation parameters (responsive to orientation)
var baseRatioR = 0.0;
var baseRatioStrength = 0.0;

const updateBaseRatio = () => {
    const isPortrait = CH > CW;
    baseRatioR = isPortrait ? 0.05 : 0.4;
    baseRatioStrength = isPortrait ? 0.4 : 0.6;
}

updateBaseRatio();

let R = CH * baseRatioR;
let strength = CH * baseRatioStrength;
let fadeValue = 1;

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Check if mouse is within text bounds
    const paddingRatio = baseRatioR;
    const padding = CH * paddingRatio;  
    const isHovering = (
        mouseWorldX >= -textBounds.width / 2 - padding &&
        mouseWorldX <= textBounds.width / 2 + padding &&
        mouseWorldY >= -textBounds.height / 2 - padding &&
        mouseWorldY <= textBounds.height / 2 + padding
    );

    const posArray = geometry.attributes.position.array;
    const origArray = geometry.attributes.originalPosition.array;
    
    if (isHovering) {
        for (let i = 0; i < pointPositions.length; i++) {
            const ox = origArray[i * 3];
            const oy = origArray[i * 3 + 1];
            const dx = ox - mouseWorldX;
            const dy = oy - mouseWorldY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < R && distance > 0) {
                const directionX = dx / distance;
                const directionY = dy / distance;
                const force = (1 - distance / R) * strength;
                const targetX = ox + directionX * force;
                const targetY = oy + directionY * force;
                
                posArray[i * 3] += (targetX - posArray[i * 3]) * 0.1;
                posArray[i * 3 + 1] += (targetY - posArray[i * 3 + 1]) * 0.1;
            } else {
                posArray[i * 3] += (ox - posArray[i * 3]) * 0.1;
                posArray[i * 3 + 1] += (oy - posArray[i * 3 + 1]) * 0.1;
            }
            posArray[i * 3 + 2] = 0.1;
        }
    } else {
        // Return to original positions when not hovering
        for (let i = 0; i < pointPositions.length; i++) {
            posArray[i * 3] += (origArray[i * 3] - posArray[i * 3]) * 0.1;
            posArray[i * 3 + 1] += (origArray[i * 3 + 1] - posArray[i * 3 + 1]) * 0.1;
            posArray[i * 3 + 2] = 0.1;
        }
    }

    geometry.attributes.position.needsUpdate = true;

    const targetFade = isHovering ? 0 : 1;
    fadeValue += (targetFade - fadeValue) * 0.2;

    planeMaterial.opacity = fadeValue;
    material.opacity = (1 - fadeValue);

    renderer.render(scene, camera);
}
animate();

// Handle window resize
window.addEventListener('resize', () => {
    CW = window.innerWidth;
    CH = window.innerHeight;
    
    // Update effect parameters for new resolution
    updateBaseRatio();
    R = CH * baseRatioR;
    strength = CH * baseRatioStrength;
    
    // Update renderer
    renderer.setSize(CW, CH);
    
    // Update camera
    camera.left = -CW / 2;
    camera.right = CW / 2;
    camera.top = CH / 2;
    camera.bottom = -CH / 2;
    camera.updateProjectionMatrix();
    
    // Dispose old texture and update plane
    texture.dispose();
    ({ canvas, ctx, textBounds } = createTextTexture());
    texture.image = canvas;
    texture.needsUpdate = true;
    
    // Update plane geometry
    textPlane.geometry.dispose();
    textPlane.geometry = new THREE.PlaneGeometry(CW, CH);
    
    // Regenerate point positions
    pointPositions = generatePointPositions();
    
    // Recreate geometry with new positions
    geometry.dispose();
    geometry = new THREE.BufferGeometry();
    setupPointCloud();
    points.geometry = geometry;
});

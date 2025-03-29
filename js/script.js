import * as THREE from "three";

// Dynamic favicon setup
const createFavicon = () => {
  const size = 16;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const text = "zeo.lol";
  const state = {
    scrollPos: 0,
    baseSpeed: 1.5,
    currentSpeed: 1.5,
    speedMultiplier: 1,
    hueOffset: 0,
    frame: 0,
  };

  // Create gradient colors
  const createGradient = (offset) => {
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    const stops = [
      [0, "#ff6b6b"],
      [0.33, "#4ecdc4"],
      [0.66, "#45b7d1"],
      [1, "#96f"],
    ];

    stops.forEach(([pos, color]) => {
      const adjustedPos = (pos + offset / 100) % 1;
      gradient.addColorStop(adjustedPos, color);
    });

    return gradient;
  };

  return {
    setSpeedMultiplier(multiplier) {
      state.speedMultiplier = multiplier;
      state.currentSpeed = state.baseSpeed * multiplier;
    },

    update() {
      state.frame++;

      // Clear canvas
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, size, size);

      // Draw gradient background
      ctx.fillStyle = createGradient(state.hueOffset);
      ctx.fillRect(0, 0, size, size);

      // Update gradient animation
      state.hueOffset = (state.hueOffset + 2.5 * state.speedMultiplier) % 100;

      // Draw text
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      // Calculate text width for a single letter
      const letterWidth = ctx.measureText("W").width;
 
      // Update and draw letters
      for (let i = 0; i < text.length; i++) {
        const y = size / 2 + Math.sin(state.frame / 5 + i / 2) * 4;

        // Calculate x position with scroll
        const totalWidth = text.length * letterWidth + size;
        let xPos = size - (state.scrollPos % totalWidth) + i * letterWidth;

        // Draw the letter
        const currentChar = text[i];

        // Add text stroke for better visibility
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.strokeText(currentChar, xPos, y);

        // Draw the actual letter
        ctx.fillStyle = "#000";
        ctx.fillText(currentChar, xPos, y);

        // Draw the letter again when it's about to disappear
        if (xPos + letterWidth < size) {
          ctx.strokeText(currentChar, xPos + totalWidth, y);
          ctx.fillText(currentChar, xPos + totalWidth, y);
        }
      }

      // Update scroll position
      state.scrollPos += state.currentSpeed;

      // Update favicon
      let favicon = document.getElementById("dynamic-favicon");
      if (!favicon) {
        favicon = document.createElement("link");
        favicon.id = "dynamic-favicon";
        favicon.rel = "icon";
        document.head.appendChild(favicon);
      }

      favicon.href = canvas.toDataURL("image/png");
    },
  };
};

const favicon = createFavicon();

// Handle page visibility changes
document.addEventListener("visibilitychange", () => {
  favicon.setSpeedMultiplier(document.hidden ? 5 : 1);
});

// Update both favicon and title
const titleText = "zeo.lol";
let titleScrollPos = 0;
const updateAll = () => {
  favicon.update();

  // Update title marquee
  const visibleLength = titleText.length * 2;
  const scrolledTitle = titleText.padEnd(visibleLength, " ").repeat(2);
  const startIdx = Math.floor(titleScrollPos % titleText.length);
  const displayText = scrolledTitle.substring(
    startIdx,
    startIdx + visibleLength
  );
  document.title = displayText;
  titleScrollPos += document.hidden ? 1 : 0.3;
};

// Run the animation loop
setInterval(updateAll, 50);

const detectMobile = () => {
  const toMatch = [
    /Android/i,
    /webOS/i,
    /iPhone/i,
    /iPad/i,
    /iPod/i,
    /BlackBerry/i,
    /Windows Phone/i,
  ];

  return toMatch.some((toMatchItem) => {
    return navigator.userAgent.match(toMatchItem);
  });
};

// Scene setup with dynamic dimensions
let CW = window.innerWidth;
let CH = window.innerHeight;

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(
  -CW / 2,
  CW / 2,
  CH / 2,
  -CH / 2,
  1,
  1000
);
camera.position.z = 50;
camera.lookAt(0, 0, 0);

// Add basic lighting
const ambientLight = new THREE.AmbientLight(0xcccccc, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

// Worm movement system
let wormPosition = { x: 0, y: 0 };
let wormVelocity = { x: 0, y: 0 };
let wormDirection = 0;
let wormTargetDirection = 0;
let wormSpeed = 0.8;
let wormSpeedFactor = 1;
const wormMaxTurnRate = Math.PI / 60;
const wormSegments = 200;
const wormRadius = 2;
const wormLength = Math.min(CW, CH) * 0.6;

// Initialize worm path with valid numbers
const wormPath = new THREE.CatmullRomCurve3();
const wormPoints = [];
for (let i = 0; i < wormSegments; i++) {
  const t = i / wormSegments;
  const y = (t - 0.5) * wormLength;
  wormPoints.push(new THREE.Vector3(0, y, 0));
}
wormPath.points = wormPoints;

const wormGeometry = new THREE.TubeGeometry(
  wormPath,
  wormSegments,
  wormRadius,
  8,
  false
);
const wormDebugMaterial = new THREE.MeshBasicMaterial({
  color: 0xff0000,
  wireframe: true,
});
let useDebugWormMaterial = false;

const wormMaterial = new THREE.MeshPhongMaterial({
  color: 0x88ccff,
  transparent: true,
  opacity: 0.7,
  side: THREE.DoubleSide,
  specular: 0x111111,
  shininess: 30,
});
const worm = new THREE.Mesh(
  wormGeometry,
  useDebugWormMaterial ? wormDebugMaterial : wormMaterial
);
worm.renderOrder = 0;
scene.add(worm);

// Food system
const foodItems = [];
const maxFoodCount = 200;
const foodSpawnInterval = 3000; // ms (3 seconds)
const foodRadius = 5;
const wormSensingRadius = 60; // How far the worm can "sense" food
const wormEatingRadius = 15; // How close the worm needs to be to eat

const foodGeometry = new THREE.SphereGeometry(foodRadius, 12, 12);
const foodMaterial = new THREE.MeshPhongMaterial({
  color: 0xffa500, // Orange
  specular: 0x333333,
  shininess: 50,
});

function spawnFoodAt(x, y) {
  const clampMargin = foodRadius * 2;
  const clampedX = THREE.MathUtils.clamp(
    x,
    -CW / 2 + clampMargin,
    CW / 2 - clampMargin
  );
  const clampedY = THREE.MathUtils.clamp(
    y,
    -CH / 2 + clampMargin,
    CH / 2 - clampMargin
  );
  const z = 0;

  const foodMesh = new THREE.Mesh(foodGeometry, foodMaterial);
  foodMesh.position.set(clampedX, clampedY, z);

  foodItems.push(foodMesh);
  scene.add(foodMesh);
}

function spawnFood(nearWorm = false) {
  if (foodItems.length >= maxFoodCount) {
    return;
  }
  if (CH > CW && Math.random() > 0.5) {
    return; // Spawn less food on mobile
  }

  let targetX, targetY;
  const marginX = CW * 0.1;
  const marginY = CH * 0.1;

  if (nearWorm && wormPath && wormPath.points && wormPath.points.length > 0) {
    const wormHeadPos = wormPath.points[wormSegments - 1];
    const spawnRadiusNearWorm = wormSensingRadius * 4;

    targetX =
      wormHeadPos.x +
      THREE.MathUtils.randFloat(-spawnRadiusNearWorm, spawnRadiusNearWorm);
    targetY =
      wormHeadPos.y +
      THREE.MathUtils.randFloat(-spawnRadiusNearWorm, spawnRadiusNearWorm);
  } else {
    targetX = THREE.MathUtils.randFloat(-CW / 2 + marginX, CW / 2 - marginX);
    targetY = THREE.MathUtils.randFloat(-CH / 2 + marginY, CH / 2 - marginY);
  }

  spawnFoodAt(targetX, targetY);
}

document.addEventListener("click", (event) => {
  const x = event.clientX - CW / 2;
  const y = -(event.clientY - CH / 2);
  spawnFoodAt(x, y);
});

let lastTimeSpawned = Date.now();

function eatFood(foodIndex) {
  const foodMesh = foodItems[foodIndex];
  scene.remove(foodMesh);
  foodItems.splice(foodIndex, 1);
  lastTimeSpawned = Date.now();

  if (Math.random() > 0.5) spawnFood();
}

setInterval(spawnFood, foodSpawnInterval);

// Spawn some food near the worm
setTimeout(() => {
  for (let i = 0; i < 20; i++) {
    spawnFood(true);
  }
}, 100);

// and some far
for (let i = 0; i < 40; i++) {
  spawnFood(false);
}

function updateWorm() {
  if (!BRAIN) {
    return;
  }
  if (Date.now() - lastTimeSpawned > 5000) {
    lastTimeSpawned = Date.now();
    for (let i = 0; i < 10; i++) {
      spawnFood(true);
    }
  }

  // Get current head position for calculations BEFORE updating it
  const headPos = new THREE.Vector3().copy(wormPath.points[wormSegments - 1]);

  // Boundary collision detection
  const boundaryThreshold = 20;
  BRAIN.stimulateNoseTouchNeurons = false; // Reset touch stimulus

  if (
    headPos.x < -CW / 2 + boundaryThreshold ||
    headPos.x > CW / 2 - boundaryThreshold ||
    headPos.y < -CH / 2 + boundaryThreshold ||
    headPos.y > CH / 2 - boundaryThreshold
  ) {
    BRAIN.stimulateNoseTouchNeurons = true; // Stimulate on boundary proximity

    // Bounce logic
    if (headPos.x < -CW / 2 + boundaryThreshold && wormVelocity.x < 0) {
      wormVelocity.x *= -0.5; // Dampen velocity on bounce
      wormTargetDirection =
        Math.atan2(wormVelocity.y, wormVelocity.x) +
        ((Math.random() - 0.5) * Math.PI) / 2; // Randomize direction slightly
    } else if (headPos.x > CW / 2 - boundaryThreshold && wormVelocity.x > 0) {
      wormVelocity.x *= -0.5;
      wormTargetDirection =
        Math.atan2(wormVelocity.y, wormVelocity.x) +
        ((Math.random() - 0.5) * Math.PI) / 2;
    }

    if (headPos.y < -CH / 2 + boundaryThreshold && wormVelocity.y < 0) {
      wormVelocity.y *= -0.5;
      wormTargetDirection =
        Math.atan2(wormVelocity.y, wormVelocity.x) +
        ((Math.random() - 0.5) * Math.PI) / 2;
    } else if (headPos.y > CH / 2 - boundaryThreshold && wormVelocity.y > 0) {
      wormVelocity.y *= -0.5;
      wormTargetDirection =
        Math.atan2(wormVelocity.y, wormVelocity.x) +
        ((Math.random() - 0.5) * Math.PI) / 2;
    }
    wormDirection = wormTargetDirection; // Immediately face new direction after bounce
  }

  // Food interaction logic
  if (typeof BRAIN !== "undefined") {
    BRAIN.stimulateFoodSenseNeurons = false; // Reset food sense each frame
  }

  let foodEatenThisFrame = false;
  for (let i = foodItems.length - 1; i >= 0; i--) {
    // Iterate backwards for safe removal
    if (!foodItems[i]) continue; // Should not happen, but safe check
    const foodPos = foodItems[i].position;
    const distanceToFood = headPos.distanceTo(foodPos);

    // Sensing check
    if (distanceToFood < wormSensingRadius) {
      if (typeof BRAIN !== "undefined") {
        BRAIN.stimulateFoodSenseNeurons = true; // Stimulate if any food is close
      }

      // Eating check
      if (distanceToFood < wormEatingRadius + wormRadius) {
        // Check collision with worm radius too
        eatFood(i);
        foodEatenThisFrame = true;
        break; // Eat only one food per frame
      }
    }
  }

  // Hunger stimulus
  if (typeof BRAIN !== "undefined") {
    BRAIN.stimulateHungerNeurons = true;
  }

  // Brain influence on movement
  if (
    typeof BRAIN !== "undefined" &&
    BRAIN.accumleft !== undefined &&
    BRAIN.accumright !== undefined &&
    !isNaN(BRAIN.accumleft) &&
    !isNaN(BRAIN.accumright)
  ) {
    const muscleDiff = BRAIN.accumleft - BRAIN.accumright;
    // Adjust turn sensitivity based on stimuli
    let turnSensitivity = 0.015;
    if (BRAIN.stimulateNoseTouchNeurons) turnSensitivity *= 2; // Turn sharper near walls
    if (BRAIN.stimulateFoodSenseNeurons) turnSensitivity *= 1.5; // Turn sharper towards food

    wormTargetDirection += muscleDiff * turnSensitivity;

    // Adjust speed based on brain output and maybe hunger/food
    let baseSpeedTarget =
      0.6 + (Math.abs(BRAIN.accumleft) + Math.abs(BRAIN.accumright)) / 150;
    // if (foodEatenThisFrame) baseSpeedTarget *= 1.2; // Example: slightly faster after eating

    wormSpeed = THREE.MathUtils.clamp(baseSpeedTarget, 0.3, 2.5);
  } else {
    wormSpeed = 0.8; // Default speed if brain data is unavailable
  }

  // Smooth turning
  let deltaDir = wormTargetDirection - wormDirection;
  while (deltaDir > Math.PI) deltaDir -= Math.PI * 2;
  while (deltaDir < -Math.PI) deltaDir += Math.PI * 2;
  deltaDir = THREE.MathUtils.clamp(deltaDir, -wormMaxTurnRate, wormMaxTurnRate);
  wormDirection += deltaDir;
  while (wormDirection > Math.PI) wormDirection -= Math.PI * 2;
  while (wormDirection < -Math.PI) wormDirection += Math.PI * 2;

  // Calculate velocity
  wormVelocity.x = Math.cos(wormDirection) * wormSpeed * wormSpeedFactor;
  wormVelocity.y = Math.sin(wormDirection) * wormSpeed * wormSpeedFactor;

  // Update position (apply velocity)
  wormPosition.x += wormVelocity.x;
  wormPosition.y += wormVelocity.y;

  // Clamp position (redundant with boundary bounce, but safe fallback)
  wormPosition.x = THREE.MathUtils.clamp(
    wormPosition.x,
    -CW / 2 + wormRadius,
    CW / 2 - wormRadius
  );
  wormPosition.y = THREE.MathUtils.clamp(
    wormPosition.y,
    -CH / 2 + wormRadius,
    CH / 2 - wormRadius
  );

  const localWormPoints = wormPath.points;
  const segmentLength = wormLength / wormSegments;

  if (isNaN(segmentLength) || segmentLength <= 1e-6) {
    console.error("Invalid segmentLength:", segmentLength);
    return;
  }

  // Update head
  localWormPoints[wormSegments - 1].set(wormPosition.x, wormPosition.y, 0);

  // IK: Build body backwards
  for (let i = wormSegments - 2; i >= 0; i--) {
    const nextPoint = localWormPoints[i + 1];
    const currentPoint = localWormPoints[i];
    const desiredPos = currentPoint
      .clone()
      .sub(nextPoint)
      .normalize()
      .multiplyScalar(segmentLength)
      .add(nextPoint);
    currentPoint.lerp(desiredPos, 0.8); // IK constraint satisfaction
    currentPoint.z = 0;
  }

  // Relaxation pass
  /*
    for (let iter = 0; iter < 2; iter++) {
      localWormPoints[wormSegments - 1].set(wormPosition.x, wormPosition.y, 0);

      // Forward pass (constraint from tail)
      for (let i = 1; i < wormSegments; i++) {
        const prevPoint = localWormPoints[i - 1];
        const currentPoint = localWormPoints[i];
        const direction = currentPoint.clone().sub(prevPoint);
        const dist = direction.length();
        if (dist > 1e-6) {
          const correction = direction.multiplyScalar((dist - segmentLength) / dist * 0.5);
          currentPoint.sub(correction);
          prevPoint.add(correction);
        }
      }
    }
  */

  // Update tube geometry
  wormPath.needsUpdate = true;
  worm.geometry.dispose();
  worm.geometry = new THREE.TubeGeometry(
    wormPath,
    Math.floor(wormSegments / 2),
    wormRadius,
    8,
    false
  );
}

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true, // Enable transparency
});
console.log("Renderer created:", renderer); // Debug log
renderer.setSize(CW, CH);

// Initialize brain after Three.js is ready
if (typeof BRAIN !== "undefined") {
  BRAIN.setup();
  BRAIN.randExcite();
} else {
  console.warn("BRAIN not defined - connectome.js may not be loaded");
}
document.body.appendChild(renderer.domElement);

// renderer
document.body.appendChild(renderer.domElement);

// Text measurement function
const measureText = (ctx, text, fontSize, fontFamily) => {
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(text);
  return {
    width: metrics.width,
    height: fontSize,
  };
};

const secretPharses = [
  "lol.zeo",
  "meow",
  "🐱",
  "🐶",
  "🐕",
  "🐈",
  "owo.whats.this",
  "rawr.xd",
  "💀👍",
  "👽🛸",
  "🦖🌋",
];

// Create text texture
var text = "zeo.lol🐱";
if (Math.random() > 0.5) {
  text = secretPharses[Math.floor(Math.random() * secretPharses.length)];
  setTimeout(() => {
    text = "zeo.lol🐱";
    resizeHandler();
  }, 5000);
}

const createTextTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = CW;
  canvas.height = CH;
  const ctx = canvas.getContext("2d");

  // Clear and draw text
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, CW, CH);

  // Calculate font size based on both width and height, with maximum limit
  const fontSize = Math.min(Math.min(CW / 6, CH / 4), 120);
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "white";

  const textMetrics = measureText(ctx, text, fontSize, "Arial");

  ctx.fillText(text, CW / 2, CH / 2);

  return {
    canvas,
    ctx,
    textBounds: {
      width: textMetrics.width,
      height: textMetrics.height,
      x: CW / 2 - textMetrics.width / 2,
      y: CH / 2 - textMetrics.height / 2,
    },
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
  blending: THREE.AdditiveBlending,
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
      if (
        data[index + 3] == 255 &&
        (data[index] > 0 || data[index + 1] > 0 || data[index + 2] > 0)
      ) {
        const x = i - CW / 2;
        const y = CH / 2 - j;
        const r = data[index] / 255;
        const g = data[index + 1] / 255;
        const b = data[index + 2] / 255;
        pointPositions.push({ x, y, z: 0.1, r, g, b });
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
  const colors = new Float32Array(pointPositions.length * 3);
  const originalPositions = new Float32Array(pointPositions.length * 3);
  for (let i = 0; i < pointPositions.length; i++) {
    positions[i * 3] = pointPositions[i].x;
    positions[i * 3 + 1] = pointPositions[i].y;
    positions[i * 3 + 2] = pointPositions[i].z;
    colors[i * 3] = pointPositions[i].r;
    colors[i * 3 + 1] = pointPositions[i].g;
    colors[i * 3 + 2] = pointPositions[i].b;
    originalPositions[i * 3] = pointPositions[i].x;
    originalPositions[i * 3 + 1] = pointPositions[i].y;
    originalPositions[i * 3 + 2] = pointPositions[i].z;
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute(
    "originalPosition",
    new THREE.BufferAttribute(originalPositions, 3)
  );
};

setupPointCloud();

const material = new THREE.PointsMaterial({
  size: detectMobile() ? 3 : 1,
  vertexColors: true,
  transparent: true,
  opacity: 0,
  alphaTest: 0.001,
  depthWrite: false,
  depthTest: false,
  blending: THREE.AdditiveBlending,
});

const points = new THREE.Points(geometry, material);
textPlane.renderOrder = 1;
points.renderOrder = 2;
scene.add(points);

// Mouse handling
const mouse = new THREE.Vector2();
mouse.x = Infinity;
mouse.y = Infinity;
let mouseWorldX = Infinity;
let mouseWorldY = Infinity;

window.addEventListener("mousemove", (event) => {
  mouse.x = (event.clientX / CW) * 2 - 1;
  mouse.y = -(event.clientY / CH) * 2 + 1;
  mouseWorldX = mouse.x * (CW / 2);
  mouseWorldY = mouse.y * (CH / 2);
});
window.addEventListener("touchmove", (event) => {
  const touch = event.touches[0];
  mouse.x = (touch.clientX / CW) * 2 - 1;
  mouse.y = -(touch.clientY / CH) * 2 + 1;
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
};

updateBaseRatio();

let R = CH * baseRatioR;
let strength = CH * baseRatioStrength;
let fadeValue = 1;
let didResetPoints = false;

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Update connectome and worm
  if (typeof BRAIN !== "undefined" && BRAIN.update) {
    BRAIN.update();
    updateWorm();
  }

  // Check if mouse is within text bounds
  const paddingRatio = baseRatioR;
  const padding = CH * paddingRatio;
  const isHovering =
    mouseWorldX >= -textBounds.width / 2 - padding &&
    mouseWorldX <= textBounds.width / 2 + padding &&
    mouseWorldY >= -textBounds.height / 2 - padding &&
    mouseWorldY <= textBounds.height / 2 + padding;

  const posArray = geometry.attributes.position.array;
  const origArray = geometry.attributes.originalPosition.array;

  if (isHovering) {
    didResetPoints = false;
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
  } else if (!didResetPoints) {
    // Return to original positions when not hovering
    for (let i = 0; i < pointPositions.length; i++) {
      posArray[i * 3] += (origArray[i * 3] - posArray[i * 3]) * 0.1;
      posArray[i * 3 + 1] += (origArray[i * 3 + 1] - posArray[i * 3 + 1]) * 0.1;
      posArray[i * 3 + 2] = 0.1;
    }
    didResetPoints = true;
  }

  geometry.attributes.position.needsUpdate = true;

  const targetFade = isHovering ? 0 : 1;
  fadeValue += (targetFade - fadeValue) * 0.2;

  planeMaterial.opacity = fadeValue;
  material.opacity = 1 - fadeValue;

  renderer.render(scene, camera);
}
animate();

const resizeHandler = () => {
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
  points.material.size = detectMobile() ? 3 : 1;
  points.geometry = geometry;
};

// Handle window resize
window.addEventListener("resize", resizeHandler);

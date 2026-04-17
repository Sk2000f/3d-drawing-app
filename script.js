// ================== THREE.JS SETUP ==================
let scene, camera, renderer, controls;
let currentTool = 'brush';
let isDrawing = false;
let currentColor = 0xff0000;
let currentSize = 1;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let objects = [];
let history = [];
let historyIndex = -1;
let lineStart = null;

// Initialization
window.addEventListener('DOMContentLoaded', init);

function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    // Camera setup
    const width = document.getElementById('canvas').clientWidth;
    const height = document.getElementById('canvas').clientHeight;
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 5, 10);

    // Renderer setup
    const canvas = document.getElementById('canvas');
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    canvas.appendChild(renderer.domElement);

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Grid
    const gridHelper = new THREE.GridHelper(50, 50);
    scene.add(gridHelper);

    // Setup event listeners
    setupEventListeners();
    
    // Save initial state
    saveHistory();

    // Animation loop
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// ================== EVENT LISTENERS ==================
function setupEventListeners() {
    // Tool buttons
    document.getElementById('brushBtn').addEventListener('click', function() { setTool('brush', this); });
    document.getElementById('pencilBtn').addEventListener('click', function() { setTool('pencil', this); });
    document.getElementById('lineBtn').addEventListener('click', function() { setTool('line', this); });
    document.getElementById('sphereBtn').addEventListener('click', function() { setTool('sphere', this); });
    document.getElementById('cubeBtn').addEventListener('click', function() { setTool('cube', this); });
    document.getElementById('coneBtn').addEventListener('click', function() { setTool('cone', this); });

    // Action buttons
    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('redoBtn').addEventListener('click', redo);
    document.getElementById('clearBtn').addEventListener('click', clearCanvas);
    document.getElementById('saveBtn').addEventListener('click', saveDrawing);
    document.getElementById('exportBtn').addEventListener('click', exportPNG);
    document.getElementById('loadBtn').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });

    // Color and size pickers
    document.getElementById('colorPicker').addEventListener('change', (e) => {
        currentColor = parseInt(e.target.value.slice(1), 16);
    });

    document.getElementById('sizePicker').addEventListener('input', (e) => {
        currentSize = parseFloat(e.target.value);
    });

    // Mouse events
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);

    // File input
    document.getElementById('fileInput').addEventListener('change', loadDrawing);

    // Window resize
    window.addEventListener('resize', onWindowResize);
}

// ================== TOOL MANAGEMENT ==================
function setTool(tool, button) {
    currentTool = tool;
    document.getElementById('currentTool').textContent = `Current Tool: ${tool.charAt(0).toUpperCase() + tool.slice(1)}`;
    
    // Update button styling
    document.querySelectorAll('.tool-button').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');
}

// ================== DRAWING FUNCTIONS ==================
function onMouseDown(event) {
    if (event.button !== 0) return;

    isDrawing = true;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (currentTool === 'line') {
        lineStart = { x: mouse.x, y: mouse.y };
    }
}

function onMouseMove(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (!isDrawing) return;

    if (['brush', 'pencil'].includes(currentTool)) {
        drawPoint();
    }
}

function onMouseUp(event) {
    if (currentTool === 'line' && lineStart) {
        const endX = mouse.x;
        const endY = mouse.y;
        drawLine(lineStart.x, lineStart.y, endX, endY);
        lineStart = null;
    }
    isDrawing = false;
}

function drawPoint() {
    const geometry = new THREE.SphereGeometry(currentSize * 0.1, 8, 8);
    const material = new THREE.MeshPhongMaterial({ color: currentColor });
    const sphere = new THREE.Mesh(geometry, material);

    const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
    vector.unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    const pos = camera.position.clone().add(dir.multiplyScalar(distance));

    sphere.position.copy(pos);
    sphere.castShadow = true;
    sphere.receiveShadow = true;

    scene.add(sphere);
    objects.push(sphere);
}

function drawLine(x1, y1, x2, y2) {
    const vector1 = new THREE.Vector3(x1, y1, 0.5);
    vector1.unproject(camera);
    const dir1 = vector1.sub(camera.position).normalize();
    const distance1 = -camera.position.z / dir1.z;
    const pos1 = camera.position.clone().add(dir1.multiplyScalar(distance1));

    const vector2 = new THREE.Vector3(x2, y2, 0.5);
    vector2.unproject(camera);
    const dir2 = vector2.sub(camera.position).normalize();
    const distance2 = -camera.position.z / dir2.z;
    const pos2 = camera.position.clone().add(dir2.multiplyScalar(distance2));

    const geometry = new THREE.BufferGeometry().setFromPoints([pos1, pos2]);
    const material = new THREE.LineBasicMaterial({ color: currentColor, linewidth: currentSize * 5 });
    const line = new THREE.Line(geometry, material);

    scene.add(line);
    objects.push(line);
    saveHistory();
}

function addShape(shapeType) {
    let geometry;

    switch (shapeType) {
        case 'sphere':
            geometry = new THREE.SphereGeometry(currentSize, 32, 32);
            break;
        case 'cube':
            geometry = new THREE.BoxGeometry(currentSize * 2, currentSize * 2, currentSize * 2);
            break;
        case 'cone':
            geometry = new THREE.ConeGeometry(currentSize, currentSize * 2, 32);
            break;
    }

    const material = new THREE.MeshPhongMaterial({ color: currentColor });
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(
        (Math.random() - 0.5) * 10,
        5 + (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 10
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    scene.add(mesh);
    objects.push(mesh);
    saveHistory();
}

// Store original onMouseDown
const originalOnMouseDown = onMouseDown;
renderer.domElement.addEventListener('mousedown', function(event) {
    if (['sphere', 'cube', 'cone'].includes(currentTool)) {
        event.preventDefault();
        addShape(currentTool);
    }
}, true);

// ================== UNDO/REDO ==================
function saveHistory() {
    historyIndex++;
    history.splice(historyIndex);
    history.push(objects.map(obj => obj.clone()));
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        restoreHistory(historyIndex);
    }
}

function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        restoreHistory(historyIndex);
    }
}

function restoreHistory(index) {
    // Remove all objects
    objects.forEach(obj => scene.remove(obj));
    objects = [];

    // Add objects from history
    history[index].forEach(obj => {
        const cloned = obj.clone();
        scene.add(cloned);
        objects.push(cloned);
    });
}

// ================== SAVE/LOAD/EXPORT ==================
function clearCanvas() {
    objects.forEach(obj => scene.remove(obj));
    objects = [];
    saveHistory();
}

function saveDrawing() {
    const drawing = {
        timestamp: new Date().toISOString(),
        objects: objects.length
    };

    const dataStr = JSON.stringify(drawing);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `drawing_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

function loadDrawing(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            alert(`Drawing loaded! Contains ${data.objects} objects.`);
        } catch (error) {
            alert('Error loading drawing');
        }
    };
    reader.readAsText(file);
    document.getElementById('fileInput').value = '';
}

function exportPNG() {
    const link = document.createElement('a');
    link.href = renderer.domElement.toDataURL('image/png');
    link.download = `drawing_${Date.now()}.png`;
    link.click();
}

// ================== RESPONSIVE ==================
function onWindowResize() {
    const canvas = document.getElementById('canvas');
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
      }

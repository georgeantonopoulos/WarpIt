// UFO Crop Circles - 3D Interactive Game
class UFOCropCirclesGame {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.ufo = null;
        this.grassField = null;
        this.cropCircles = [];
        
        // Game state
        this.circleCount = 0;
        this.energy = 100;
        this.altitude = 25;
        this.isCreatingCircle = false;
        
        // Controls
        this.keys = {};
        this.mouse = { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        
        // Wind system
        this.windTime = 0;
        this.grassInstances = [];
        
        this.init();
    }

    init() {
        this.createScene();
        this.createLights();
        this.createTerrain();
        this.createGrassField();
        this.createUFO();
        this.createSkybox();
        this.setupControls();
        this.setupEventListeners();
        this.animate();
        
        // Hide loading screen
        document.getElementById('loading').style.display = 'none';
    }

    createScene() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x1a1a2e, 100, 1000);

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.camera.position.set(0, 25, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x1a1a2e);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        document.getElementById('gameContainer').appendChild(this.renderer.domElement);
    }

    createLights() {
        // Ambient light (night scene)
        const ambientLight = new THREE.AmbientLight(0x404080, 0.3);
        this.scene.add(ambientLight);

        // Moon light
        const moonLight = new THREE.DirectionalLight(0xffffff, 0.5);
        moonLight.position.set(100, 200, 100);
        moonLight.castShadow = true;
        moonLight.shadow.mapSize.width = 2048;
        moonLight.shadow.mapSize.height = 2048;
        moonLight.shadow.camera.near = 0.5;
        moonLight.shadow.camera.far = 500;
        moonLight.shadow.camera.left = -200;
        moonLight.shadow.camera.right = 200;
        moonLight.shadow.camera.top = 200;
        moonLight.shadow.camera.bottom = -200;
        this.scene.add(moonLight);

        // UFO spotlight (will be created with UFO)
        this.ufoLight = new THREE.SpotLight(0x00ff88, 2, 100, Math.PI / 6, 0.3);
        this.ufoLight.castShadow = true;
        this.ufoLight.shadow.mapSize.width = 1024;
        this.ufoLight.shadow.mapSize.height = 1024;
    }

    createTerrain() {
        // Create large ground plane
        const groundGeometry = new THREE.PlaneGeometry(1000, 1000, 100, 100);
        
        // Create height variation
        const vertices = groundGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            vertices[i + 2] = Math.sin(vertices[i] * 0.01) * Math.cos(vertices[i + 1] * 0.01) * 2;
        }
        groundGeometry.attributes.position.needsUpdate = true;
        groundGeometry.computeVertexNormals();

        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x2d5a0d,
            transparent: true,
            opacity: 0.8
        });
        
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    createGrassField() {
        // Create instanced grass using custom shader
        const grassGeometry = new THREE.PlaneGeometry(0.5, 2);
        const grassCount = 10000;
        
        const grassMaterial = new THREE.MeshLambertMaterial({
            color: 0x4a7c0a,
            side: THREE.DoubleSide,
            transparent: true,
            alphaTest: 0.3
        });

        this.grassField = new THREE.InstancedMesh(grassGeometry, grassMaterial, grassCount);
        
        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const rotation = new THREE.Euler();
        const scale = new THREE.Vector3();

        // Position grass instances randomly
        for (let i = 0; i < grassCount; i++) {
            position.set(
                (Math.random() - 0.5) * 800,
                1,
                (Math.random() - 0.5) * 800
            );
            
            rotation.set(0, Math.random() * Math.PI * 2, 0);
            scale.set(1, Math.random() * 0.5 + 0.5, 1);
            
            matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
            this.grassField.setMatrixAt(i, matrix);
            
            // Store original position for wind animation
            this.grassInstances.push({
                originalPosition: position.clone(),
                phase: Math.random() * Math.PI * 2,
                amplitude: Math.random() * 0.3 + 0.1
            });
        }
        
        this.grassField.instanceMatrix.needsUpdate = true;
        this.grassField.castShadow = true;
        this.grassField.receiveShadow = true;
        this.scene.add(this.grassField);
    }

    createUFO() {
        // UFO group
        this.ufo = new THREE.Group();

        // Main disc
        const discGeometry = new THREE.CylinderGeometry(8, 12, 2, 32);
        const discMaterial = new THREE.MeshPhongMaterial({
            color: 0x666666,
            shininess: 100,
            emissive: 0x111111
        });
        const disc = new THREE.Mesh(discGeometry, discMaterial);
        disc.castShadow = true;
        this.ufo.add(disc);

        // Top dome
        const domeGeometry = new THREE.SphereGeometry(5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const domeMaterial = new THREE.MeshPhongMaterial({
            color: 0x888888,
            transparent: true,
            opacity: 0.7,
            emissive: 0x003300
        });
        const dome = new THREE.Mesh(domeGeometry, domeMaterial);
        dome.position.y = 1;
        dome.castShadow = true;
        this.ufo.add(dome);

        // Lights around the disc
        const lightGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const lightMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            emissive: 0x00ff88
        });

        for (let i = 0; i < 12; i++) {
            const light = new THREE.Mesh(lightGeometry, lightMaterial);
            const angle = (i / 12) * Math.PI * 2;
            light.position.set(
                Math.cos(angle) * 10,
                -0.5,
                Math.sin(angle) * 10
            );
            this.ufo.add(light);
        }

        // Add UFO spotlight
        this.ufoLight.position.set(0, -5, 0);
        this.ufoLight.target.position.set(0, -20, 0);
        this.ufo.add(this.ufoLight);
        this.ufo.add(this.ufoLight.target);

        this.ufo.position.set(0, 25, 0);
        this.scene.add(this.ufo);

        // Particle system for UFO trail
        this.createUFOParticles();
    }

    createUFOParticles() {
        const particleGeometry = new THREE.BufferGeometry();
        const particleCount = 100;
        const positions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount * 3; i++) {
            positions[i] = 0;
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            color: 0x00ff88,
            size: 0.5,
            transparent: true,
            opacity: 0.6
        });
        
        this.ufoParticles = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(this.ufoParticles);
    }

    createSkybox() {
        // Create starfield
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 1000;
        const starPositions = new Float32Array(starCount * 3);
        
        for (let i = 0; i < starCount * 3; i += 3) {
            starPositions[i] = (Math.random() - 0.5) * 2000;
            starPositions[i + 1] = Math.random() * 1000 + 100;
            starPositions[i + 2] = (Math.random() - 0.5) * 2000;
        }
        
        starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        
        const starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 2,
            sizeAttenuation: false
        });
        
        const stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(stars);
    }

    setupControls() {
        // Request pointer lock on click
        document.addEventListener('click', () => {
            document.body.requestPointerLock();
        });

        // Mouse movement
        document.addEventListener('mousemove', (event) => {
            if (document.pointerLockElement === document.body) {
                this.mouse.x += event.movementX * 0.002;
                this.mouse.y += event.movementY * 0.002;
                this.mouse.y = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.mouse.y));
            }
        });
    }

    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
            
            if (event.code === 'Space') {
                event.preventDefault();
                this.createCropCircle();
            }
        });

        document.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    updateMovement() {
        const speed = this.keys['ShiftLeft'] ? 1.5 : 0.8;
        const dampening = 0.9;

        // Movement input
        if (this.keys['KeyW']) this.velocity.z -= speed;
        if (this.keys['KeyS']) this.velocity.z += speed;
        if (this.keys['KeyA']) this.velocity.x -= speed;
        if (this.keys['KeyD']) this.velocity.x += speed;

        // Apply dampening
        this.velocity.x *= dampening;
        this.velocity.z *= dampening;

        // Update UFO position
        this.ufo.position.x += this.velocity.x;
        this.ufo.position.z += this.velocity.z;

        // Height control
        if (this.keys['KeyQ']) this.altitude = Math.min(100, this.altitude + 1);
        if (this.keys['KeyE']) this.altitude = Math.max(5, this.altitude - 1);
        
        this.ufo.position.y = this.altitude;

        // UFO rotation based on movement
        this.ufo.rotation.z = -this.velocity.x * 0.1;
        this.ufo.rotation.x = this.velocity.z * 0.1;
        this.ufo.rotation.y += 0.01;

        // Camera follows UFO with mouse look
        this.camera.position.copy(this.ufo.position);
        this.camera.position.y += 5;
        this.camera.rotation.x = this.mouse.y;
        this.camera.rotation.y = this.mouse.x;
    }

    updateWind() {
        this.windTime += 0.02;
        
        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const rotation = new THREE.Euler();
        const scale = new THREE.Vector3();

        for (let i = 0; i < this.grassInstances.length; i++) {
            const grass = this.grassInstances[i];
            
            // Wind effect
            const windX = Math.sin(this.windTime + grass.phase) * grass.amplitude;
            const windZ = Math.cos(this.windTime * 0.7 + grass.phase) * grass.amplitude * 0.5;
            
            position.copy(grass.originalPosition);
            position.x += windX;
            position.z += windZ;
            
            rotation.set(windX * 0.1, Math.random() * Math.PI * 2, windZ * 0.1);
            scale.set(1, Math.random() * 0.5 + 0.5, 1);
            
            matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
            this.grassField.setMatrixAt(i, matrix);
        }
        
        this.grassField.instanceMatrix.needsUpdate = true;
    }

    createCropCircle() {
        if (this.isCreatingCircle || this.energy < 20) return;
        
        this.isCreatingCircle = true;
        this.energy -= 20;
        
        // Create crop circle at UFO position
        const circleGeometry = new THREE.RingGeometry(5, 15, 32);
        const circleMaterial = new THREE.MeshBasicMaterial({
            color: 0x8B4513,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        
        const circle = new THREE.Mesh(circleGeometry, circleMaterial);
        circle.position.copy(this.ufo.position);
        circle.position.y = 0.1;
        circle.rotation.x = -Math.PI / 2;
        
        this.scene.add(circle);
        this.cropCircles.push(circle);
        this.circleCount++;
        
        // Create circle creation effect
        this.createCircleEffect(this.ufo.position);
        
        setTimeout(() => {
            this.isCreatingCircle = false;
        }, 2000);
    }

    createCircleEffect(position) {
        // Particle burst effect
        const particleGeometry = new THREE.BufferGeometry();
        const particleCount = 50;
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;
            
            velocities.push({
                x: (Math.random() - 0.5) * 20,
                y: Math.random() * 10,
                z: (Math.random() - 0.5) * 20
            });
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            color: 0x00ff88,
            size: 1,
            transparent: true,
            opacity: 1
        });
        
        const particles = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(particles);
        
        // Animate particles
        let life = 0;
        const animateParticles = () => {
            life += 0.02;
            const positions = particles.geometry.attributes.position.array;
            
            for (let i = 0; i < particleCount; i++) {
                positions[i * 3] += velocities[i].x * 0.1;
                positions[i * 3 + 1] += velocities[i].y * 0.1 - life * 5;
                positions[i * 3 + 2] += velocities[i].z * 0.1;
            }
            
            particles.geometry.attributes.position.needsUpdate = true;
            particleMaterial.opacity = 1 - life;
            
            if (life < 1) {
                requestAnimationFrame(animateParticles);
            } else {
                this.scene.remove(particles);
            }
        };
        
        animateParticles();
    }

    updateUI() {
        document.getElementById('circleCount').textContent = this.circleCount;
        document.getElementById('energy').textContent = Math.floor(this.energy);
        document.getElementById('altitude').textContent = Math.floor(this.altitude);
        
        // Regenerate energy slowly
        if (this.energy < 100) {
            this.energy += 0.2;
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.updateMovement();
        this.updateWind();
        this.updateUI();
        
        // UFO light intensity pulsing
        this.ufoLight.intensity = 2 + Math.sin(Date.now() * 0.005) * 0.5;
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new UFOCropCirclesGame();
});
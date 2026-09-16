import * as THREE from "./vendor/three-r186.js";

// Each model supplies its group, display controls, and triangle count. Camera
// and framing belong to the study, so the same viewer supports one tower or a scene.
export function createBuildingStudy({
  models,
  defaultView = "quarter",
  views = {
    front: { azimuth: Math.PI / 4, polar: Math.PI / 2 - 0.035, label: "front view" },
    quarter: { azimuth: Math.PI / 4 + 0.22, polar: Math.PI / 2 - 0.15, label: "three-quarter view" },
    side: { azimuth: Math.PI * 0.75, polar: Math.PI / 2 - 0.12, label: "side view" },
  },
  fov = 32,
  near = 1,
  far = 2000,
  clippingMargin = null,
  target = [0, 85, 0],
  minimumCameraHeight = null,
  fit = { height: 230, width: 98 },
  platform = { width: 76, depth: 76 },
  shadowCamera = { left: -140, right: 140, top: 160, bottom: -160, near: 1, far: 600 },
}) {
  const viewport = document.querySelector("#viewport");
  const canvas = document.querySelector("#building");
  const tooltip = document.querySelector("#tooltip");
  const viewLabel = document.querySelector("#view-label");
  const wireframeButton = document.querySelector("#wireframe");
  const turntableButton = document.querySelector("#turntable");
  const motionStatus = document.querySelector("#motion-status");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, near, far);
  const controls = new THREE.OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = false;
  controls.minPolarAngle = Math.PI * 0.12;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.target.fromArray(target);
  controls.rotateSpeed = 0.65;
  controls.zoomSpeed = 0.7;

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
  keyLight.position.set(-110, 240, 170);
  keyLight.target.position.set(0, 80, 0);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  Object.assign(keyLight.shadow.camera, shadowCamera);
  keyLight.shadow.normalBias = 0.2;
  scene.add(keyLight, keyLight.target);
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.55);
  fillLight.position.set(100, 140, -140);
  scene.add(fillLight);

  const modelOwners = new Map(models.map((model) => [model.building, model]));
  models.forEach((model) => scene.add(model.building));
  const base = new THREE.Mesh(new THREE.BoxGeometry(platform.width, 2, platform.depth), new THREE.MeshToonMaterial({ color: platform.color ?? 0x3a3a3a }));
  base.position.y = -1.1;
  base.receiveShadow = true;
  scene.add(base);
  const baseEdges = new THREE.LineSegments(new THREE.EdgesGeometry(base.geometry), new THREE.LineBasicMaterial({ color: 0x555555 }));
  baseEdges.position.copy(base.position);
  scene.add(baseEdges);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let selectedModel = null;
  let wireframe = false;
  let turning = false;
  let interacting = false;
  let frameId = 0;
  let lastTime = 0;
  let fittedDistance = 400;
  let activeView = defaultView;


  function requestRender() {
    if (!frameId && !document.hidden) frameId = requestAnimationFrame(render);
  }

  function render(time) {
    frameId = 0;
    if (turning && !document.hidden) {
      const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0;
      const offset = camera.position.clone().sub(controls.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), delta * 0.16);
      camera.position.copy(controls.target).add(offset);
      controls.update();
    }
    lastTime = time;
    renderer.render(scene, camera);
    if (turning) requestRender();
  }

  function clearHighlight() {
    selectedModel?.setHighlighted(false);
    selectedModel = null;
    tooltip.hidden = true;
    requestRender();
  }

  function markView(name) {
    activeView = name;
    viewLabel.textContent = views[name]?.label || "orbit view";
    document.querySelectorAll("[data-view]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.view === name));
    });
  }

  function setTurning(enabled) {
    turning = enabled && !reducedMotion.matches;
    lastTime = 0;
    turntableButton.setAttribute("aria-pressed", String(turning));
    turntableButton.textContent = turning ? "stop turntable" : "turntable";
    if (turning) {
      markView(null);
      clearHighlight();
    }
    requestRender();
  }

  function setView(name) {
    setTurning(false);
    const view = views[name];
    if (!view) return;
    camera.position.set(
      fittedDistance * Math.sin(view.polar) * Math.sin(view.azimuth),
      fittedDistance * Math.cos(view.polar),
      fittedDistance * Math.sin(view.polar) * Math.cos(view.azimuth),
    ).add(controls.target);
    controls.update();
    markView(name);
    clearHighlight();
  }

  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    const previousFit = fittedDistance;
    camera.aspect = width / Math.max(height, 1);
    renderer.setSize(width, height, false);
    // Fit both the tower's height and its footprint at narrow mobile widths.
    const tangent = Math.tan(camera.fov * Math.PI / 360);
    fittedDistance = Math.max(fit.height / 2 / tangent, fit.width / 2 / (tangent * camera.aspect));
    controls.minDistance = fittedDistance * 0.48;
    controls.maxDistance = fittedDistance * 2;
    if (clippingMargin !== null) {
      // Enclose the scene throughout the permitted zoom range. Moving the
      // near plane with the fit also preserves precision in narrow layouts.
      camera.near = Math.max(near, controls.minDistance - clippingMargin);
      camera.far = Math.max(far, controls.maxDistance + clippingMargin);
    }
    camera.updateProjectionMatrix();
    if (activeView) setView(activeView);
    else {
      camera.position.sub(controls.target).multiplyScalar(fittedDistance / previousFit).add(controls.target);
      controls.update();
    }
    requestRender();
  }

  controls.addEventListener("change", () => {
    // Long-lens scenes can reach below ground even at a shallow polar angle.
    // Preserve zoom distance and azimuth while keeping the eye above the base.
    if (minimumCameraHeight !== null && camera.position.y < minimumCameraHeight - 1e-6) {
      const offset = camera.position.clone().sub(controls.target);
      const distance = offset.length();
      const vertical = minimumCameraHeight - controls.target.y;
      const horizontal = Math.sqrt(Math.max(0, distance * distance - vertical * vertical));
      const scale = horizontal / Math.hypot(offset.x, offset.z);
      camera.position.set(controls.target.x + offset.x * scale, minimumCameraHeight, controls.target.z + offset.z * scale);
      controls.update();
    }
    requestRender();
  });
  controls.addEventListener("start", () => {
    interacting = true;
    setTurning(false);
    markView(null);
    clearHighlight();
  });
  controls.addEventListener("end", () => { interacting = false; });

  canvas.addEventListener("pointermove", (event) => {
    if (interacting || turning || event.pointerType === "touch") return;
    const bounds = canvas.getBoundingClientRect();
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    // Intersect the full scene so the pedestal can occlude the tower base.
    const hit = raycaster.intersectObjects(scene.children, true).find((intersection) => intersection.object.isMesh);
    let owner = hit?.object;
    while (owner && !modelOwners.has(owner)) owner = owner.parent;
    const nextModel = modelOwners.get(owner) || null;
    if (nextModel !== selectedModel) {
      selectedModel?.setHighlighted(false);
      selectedModel = nextModel;
      selectedModel?.setHighlighted(true);
      requestRender();
    }
    tooltip.hidden = !selectedModel;
    if (selectedModel) {
      tooltip.textContent = selectedModel.building.name;
      const tooltipBounds = tooltip.getBoundingClientRect();
      const x = event.clientX + 18 + tooltipBounds.width > innerWidth - 6 ? event.clientX - tooltipBounds.width - 18 : event.clientX + 18;
      const y = event.clientY + 18 + tooltipBounds.height > innerHeight - 6 ? event.clientY - tooltipBounds.height - 18 : event.clientY + 18;
      tooltip.style.left = `${Math.max(6, x)}px`;
      tooltip.style.top = `${Math.max(6, y)}px`;
    }
  }, { passive: true });
  canvas.addEventListener("pointerleave", clearHighlight);
  canvas.addEventListener("blur", clearHighlight);
  window.addEventListener("scroll", clearHighlight, { passive: true });

  canvas.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "=", "-", "Home"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") return setView(defaultView);
    setTurning(false);
    const offset = camera.position.clone().sub(controls.target);
    const distance = offset.length();
    let polar = Math.acos(offset.y / distance);
    let azimuth = Math.atan2(offset.x, offset.z);
    let nextDistance = distance;
    if (event.key === "ArrowLeft") azimuth -= Math.PI / 18;
    if (event.key === "ArrowRight") azimuth += Math.PI / 18;
    if (event.key === "ArrowUp") polar -= Math.PI / 36;
    if (event.key === "ArrowDown") polar += Math.PI / 36;
    if (event.key === "+" || event.key === "=") nextDistance *= 0.9;
    if (event.key === "-") nextDistance /= 0.9;
    polar = Math.max(controls.minPolarAngle, Math.min(controls.maxPolarAngle, polar));
    nextDistance = Math.max(controls.minDistance, Math.min(controls.maxDistance, nextDistance));
    camera.position.set(nextDistance * Math.sin(polar) * Math.sin(azimuth), nextDistance * Math.cos(polar), nextDistance * Math.sin(polar) * Math.cos(azimuth)).add(controls.target);
    controls.update();
    markView(null);
    clearHighlight();
  });

  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
  document.querySelector("#reset").addEventListener("click", () => setView(defaultView));
  wireframeButton.addEventListener("click", () => {
    wireframe = !wireframe;
    models.forEach((model) => model.setWireframe(wireframe));
    wireframeButton.setAttribute("aria-pressed", String(wireframe));
    requestRender();
  });
  turntableButton.addEventListener("click", () => setTurning(!turning));

  function updateMotionPreference() {
    controls.enabled = !reducedMotion.matches;
    turntableButton.disabled = reducedMotion.matches;
    if (reducedMotion.matches) setTurning(false);
    motionStatus.textContent = reducedMotion.matches
      ? "Reduced motion: turntable and drag movement paused. View buttons and keyboard controls change the view immediately."
      : "Camera moves only when you interact or start the turntable.";
    document.querySelector("#camera-hint").innerHTML = reducedMotion.matches
      ? '<span class="wide-hint">Use the view buttons or arrow keys to inspect<br />+ / − zoom · Home resets</span><span class="narrow-hint">Use the view buttons to inspect</span>'
      : '<span class="wide-hint">Drag to orbit · scroll or pinch to zoom<br />Arrow keys rotate · + / − zoom · Home resets</span><span class="narrow-hint">Drag to orbit · pinch to zoom</span>';
    clearHighlight();
  }
  reducedMotion.addEventListener("change", updateMotionPreference);
  document.addEventListener("visibilitychange", () => {
    lastTime = 0;
    if (document.hidden) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    } else requestRender();
  });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    setTurning(false);
    const loading = document.querySelector("#loading");
    loading.textContent = "The graphics context was interrupted. Reload to restore the 3D preview.";
    loading.hidden = false;
  });

  new ResizeObserver(resize).observe(viewport);
  updateMotionPreference();
  resize();
  renderer.render(scene, camera);
  document.querySelector("#loading").hidden = true;
  window.__buildingStudy = {
    ready: true,
    modelName: models[0].building.name,
    modelNames: models.map((model) => model.building.name),
    triangleCount: models.reduce((total, model) => total + model.triangleCount, 0),
    get activeView() { return activeView; },
    get selectedBuilding() { return selectedModel?.building.userData.buildingId || null; },
    get shadowBounds() {
      // Actual rendered geometry in the shadow camera's clip space, for coverage checks.
      const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      const point = new THREE.Vector3();
      for (const object of [...models.map((model) => model.building), base]) {
        object.traverse((child) => {
          if (!child.isMesh) return;
          const positions = child.geometry.getAttribute("position");
          for (let i = 0; i < positions.count; i += 1) {
            point.fromBufferAttribute(positions, i).applyMatrix4(child.matrixWorld).project(keyLight.shadow.camera);
            point.toArray().forEach((value, axis) => { min[axis] = Math.min(min[axis], value); max[axis] = Math.max(max[axis], value); });
          }
        });
      }
      return { min, max };
    },
    projectPoint(buildingId, coordinates) {
      const model = models.find((entry) => entry.building.userData.buildingId === buildingId);
      const point = model.building.localToWorld(new THREE.Vector3(...coordinates)).project(camera);
      return [(point.x + 1) / 2, (1 - point.y) / 2];
    },
    get cameraPosition() { return camera.position.toArray(); },
    get highlighted() { return Boolean(selectedModel); },
    get turning() { return turning; },
    get renderCount() { return renderer.info.render.frame; },
  };
}

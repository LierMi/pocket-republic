const viewOrder = ["setup", "constitution", "review", "map", "trace"];

export function getViewIndex(viewName) {
  const index = viewOrder.indexOf(viewName);
  return index >= 0 ? index : 0;
}

export function normalisePointer(clientX, clientY, width, height) {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const x = Math.max(-1, Math.min(1, (clientX / safeWidth) * 2 - 1));
  const y = Math.max(-1, Math.min(1, 1 - (clientY / safeHeight) * 2));
  return { x, y };
}

export function shouldEnableMotion({ reducedMotion, hidden }) {
  return !reducedMotion && !hidden;
}

let visualRuntime = null;

export function initVisualEffects() {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  if (visualRuntime) return visualRuntime;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const entryScreen = document.querySelector("#entryScreen");
  const canvas = document.querySelector("#entryFluidCanvas");
  const fluidScene = canvas && entryScreen ? createFluidScene(canvas, entryScreen, reducedMotion) : null;
  const cleanups = [];

  cleanups.push(bindButtonRipples());
  cleanups.push(bindMagneticElements(reducedMotion));
  cleanups.push(bindTiltCards(reducedMotion));
  cleanups.push(bindMapHotspots());

  visualRuntime = {
    fluidScene,
    reducedMotion,
    destroy() {
      fluidScene?.destroy();
      cleanups.forEach((cleanup) => cleanup?.());
      visualRuntime = null;
    },
  };

  return visualRuntime;
}

export function syncNavigation(viewName) {
  if (typeof document === "undefined") return;
  const nav = document.querySelector(".nation-nav");
  nav?.style.setProperty("--nav-index", String(getViewIndex(viewName)));
  document.querySelectorAll("[data-view-tab]").forEach((button) => {
    const active = button.dataset.viewTab === viewName;
    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
}

export function playViewTransition(panel) {
  if (!panel || typeof window === "undefined") return;
  panel.classList.remove("is-entering");
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  window.requestAnimationFrame(() => panel.classList.add("is-entering"));
  window.setTimeout(() => panel.classList.remove("is-entering"), 460);
}

export function playEntryExit() {
  if (typeof document === "undefined" || typeof window === "undefined") return Promise.resolve();
  const entryScreen = document.querySelector("#entryScreen");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!entryScreen || reduced) return Promise.resolve();
  entryScreen.classList.add("is-departing");
  visualRuntime?.fluidScene?.boostReveal();
  return new Promise((resolve) => window.setTimeout(resolve, 700));
}

export function resetEntryScene() {
  if (typeof document === "undefined") return;
  document.querySelector("#entryScreen")?.classList.remove("is-departing");
  visualRuntime?.fluidScene?.resetReveal();
}

export function pulseElement(element) {
  if (!element || typeof window === "undefined") return;
  element.classList.remove("is-pulsing");
  window.requestAnimationFrame(() => element.classList.add("is-pulsing"));
  window.setTimeout(() => element.classList.remove("is-pulsing"), 520);
}

function bindButtonRipples() {
  const controller = new AbortController();
  document.addEventListener(
    "pointerdown",
    (event) => {
      const button = event.target.closest(".button");
      if (!button || button.disabled) return;
      const bounds = button.getBoundingClientRect();
      const ripple = document.createElement("span");
      ripple.className = "button-ripple";
      ripple.style.left = `${event.clientX - bounds.left}px`;
      ripple.style.top = `${event.clientY - bounds.top}px`;
      button.append(ripple);
      button.classList.add("is-pressed");
      window.setTimeout(() => ripple.remove(), 680);
    },
    { signal: controller.signal },
  );
  document.addEventListener(
    "pointerup",
    () => document.querySelectorAll(".button.is-pressed").forEach((button) => button.classList.remove("is-pressed")),
    { signal: controller.signal },
  );
  return () => controller.abort();
}

function bindMagneticElements(reducedMotion) {
  const controller = new AbortController();
  if (reducedMotion.matches || !window.matchMedia("(pointer: fine)").matches) {
    return () => controller.abort();
  }

  document.querySelectorAll(".magnetic").forEach((element) => {
    element.addEventListener(
      "pointermove",
      (event) => {
        const bounds = element.getBoundingClientRect();
        const x = (event.clientX - bounds.left - bounds.width / 2) * 0.1;
        const y = (event.clientY - bounds.top - bounds.height / 2) * 0.13;
        element.style.transform = `translate3d(${x}px, ${y - 2}px, 0)`;
      },
      { signal: controller.signal },
    );
    element.addEventListener(
      "pointerleave",
      () => {
        element.style.transform = "";
      },
      { signal: controller.signal },
    );
  });

  return () => controller.abort();
}

function bindTiltCards(reducedMotion) {
  const controller = new AbortController();
  if (reducedMotion.matches || !window.matchMedia("(pointer: fine)").matches) {
    return () => controller.abort();
  }

  document.addEventListener(
    "pointermove",
    (event) => {
      const card = event.target.closest(".citizen-card");
      if (!card) return;
      const bounds = card.getBoundingClientRect();
      const point = normalisePointer(event.clientX - bounds.left, event.clientY - bounds.top, bounds.width, bounds.height);
      card.style.transform = `perspective(800px) rotateX(${point.y * 2.2}deg) rotateY(${point.x * 2.8}deg) translateY(-3px)`;
    },
    { signal: controller.signal },
  );
  document.addEventListener(
    "pointerout",
    (event) => {
      const card = event.target.closest(".citizen-card");
      if (!card || card.contains(event.relatedTarget)) return;
      card.style.transform = "";
    },
    { signal: controller.signal },
  );

  return () => controller.abort();
}

function bindMapHotspots() {
  const controller = new AbortController();
  document.addEventListener(
    "click",
    (event) => {
      const hotspot = event.target.closest("[data-map-target]");
      if (!hotspot) return;
      document.querySelectorAll("[data-map-target]").forEach((item) => item.classList.toggle("active", item === hotspot));
      pulseElement(hotspot);
    },
    { signal: controller.signal },
  );
  return () => controller.abort();
}

function createFluidScene(canvas, entryScreen, reducedMotion) {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    powerPreference: "low-power",
  });

  if (!gl) {
    entryScreen.classList.add("no-webgl");
    return null;
  }

  const vertexShader = `
    attribute vec2 aPosition;
    varying vec2 vUv;
    void main() {
      vUv = aPosition * 0.5 + 0.5;
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const fragmentShader = `
    precision highp float;
    varying vec2 vUv;
    uniform float uTime;
    uniform float uReveal;
    uniform vec2 uPointer;
    uniform vec2 uResolution;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p = p * 2.02 + vec2(13.1, 7.7);
        amplitude *= 0.5;
      }
      return value;
    }

    void main() {
      vec2 uv = vUv;
      float aspect = uResolution.x / max(uResolution.y, 1.0);
      vec2 centered = (uv - 0.5) * vec2(aspect, 1.0);
      vec2 pointer = uPointer * 0.13;
      float time = uTime * 0.07;
      float warpA = fbm(centered * 2.2 + vec2(time, -time) + pointer);
      float warpB = fbm(centered * 3.8 + vec2(warpA * 1.8, time * 1.4));
      float field = fbm(centered * 2.5 + vec2(warpB, warpA) * 1.7 - pointer);

      vec3 ink = vec3(0.055, 0.082, 0.145);
      vec3 cloud = vec3(0.94, 0.95, 0.90);
      vec3 coral = vec3(0.95, 0.36, 0.30);
      vec3 cyan = vec3(0.42, 0.80, 0.84);
      vec3 yellow = vec3(0.96, 0.81, 0.38);
      vec3 mint = vec3(0.43, 0.78, 0.61);

      vec3 color = mix(coral, cyan, smoothstep(0.15, 0.82, field));
      color = mix(color, yellow, smoothstep(0.72, 0.95, warpA) * 0.74);
      color = mix(color, mint, smoothstep(0.6, 0.92, warpB) * 0.42);
      float edge = smoothstep(0.9, 0.1, length(centered));
      color = mix(ink, color, 0.42 + edge * 0.58);

      float grey = dot(color, vec3(0.22, 0.66, 0.12));
      float threshold = smoothstep(field - 0.24, field + 0.24, uReveal);
      vec3 revealed = mix(mix(cloud, ink, 0.16 + grey * 0.08), color, threshold * 0.76);
      float grain = (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.035;
      gl_FragColor = vec4(revealed + grain, 0.9);
    }
  `;

  const program = createProgram(gl, vertexShader, fragmentShader);
  if (!program) {
    entryScreen.classList.add("no-webgl");
    return null;
  }

  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {
    time: gl.getUniformLocation(program, "uTime"),
    reveal: gl.getUniformLocation(program, "uReveal"),
    pointer: gl.getUniformLocation(program, "uPointer"),
    resolution: gl.getUniformLocation(program, "uResolution"),
  };

  let frame = 0;
  let startTime = performance.now();
  let revealStart = startTime;
  let revealTarget = 1;
  let pointer = { x: 0, y: 0 };
  let destroyed = false;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }

  function render(now) {
    if (destroyed) return;
    const enabled = shouldEnableMotion({
      reducedMotion: reducedMotion.matches,
      hidden: document.hidden || !document.body.classList.contains("pre-entry"),
    });

    resize();
    const revealElapsed = Math.min(1, (now - revealStart) / 1800);
    const easedReveal = 1 - Math.pow(1 - revealElapsed, 3);
    const reveal = revealTarget === 1 ? easedReveal : Math.max(0, 1 - easedReveal);
    gl.uniform1f(uniforms.time, (now - startTime) / 1000);
    gl.uniform1f(uniforms.reveal, reveal);
    gl.uniform2f(uniforms.pointer, pointer.x, pointer.y);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (enabled) {
      frame = window.requestAnimationFrame(render);
    } else {
      frame = 0;
    }
  }

  function requestRender() {
    if (!frame && !destroyed && document.body.classList.contains("pre-entry")) {
      frame = window.requestAnimationFrame(render);
    }
  }

  function onPointerMove(event) {
    pointer = normalisePointer(event.clientX, event.clientY, window.innerWidth, window.innerHeight);
  }

  function onVisibilityChange() {
    requestRender();
  }

  function onMotionChange() {
    requestRender();
  }

  entryScreen.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("visibilitychange", onVisibilityChange);
  reducedMotion.addEventListener?.("change", onMotionChange);
  window.addEventListener("resize", requestRender, { passive: true });
  requestRender();

  return {
    boostReveal() {
      revealTarget = 1;
      revealStart = performance.now() - 1200;
      requestRender();
    },
    resetReveal() {
      revealTarget = 1;
      revealStart = performance.now();
      startTime = performance.now();
      requestRender();
    },
    destroy() {
      destroyed = true;
      if (frame) window.cancelAnimationFrame(frame);
      entryScreen.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reducedMotion.removeEventListener?.("change", onMotionChange);
      window.removeEventListener("resize", requestRender);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("Pocket Republic fluid scene could not be linked.");
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("Pocket Republic fluid shader could not be compiled.");
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

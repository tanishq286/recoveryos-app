import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  Group,
  Matrix4,
  NormalBlending,
  PerspectiveCamera,
  Plane,
  Points,
  Raycaster,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";

/*
 * The record field and the route through it.
 *
 * A field of points stands for the registry. A route draws from one holding
 * (left, deep) to credit (right, near); points within its reach light as it
 * passes, and the end point turns emerald only once the route arrives.
 *
 * Once drawn, the field is quietly alive: signal pulses run along the route
 * and wake the records beside it, the sheet swells slowly, and on fine
 * pointers a lens lifts the records under the cursor. A pulse that reaches
 * credit sends one ripple out from the mark. The loop runs only while the
 * canvas is on screen and the tab is visible; reduced motion gets one still
 * frame and never animates.
 */

/*
 * Scene palettes, one per theme. Dark adds light (additive blending, a pale
 * hot core); light lays ink down (normal blending, a brighter hot core and a
 * thinner halo), because additive light disappears against a white page.
 */
const PALETTES = {
  dark: {
    ink: new Color("#7f8ea8"),
    signal: new Color("#3cc6fe"),
    hot: new Color("#c8fbff"),
    confirmed: new Color("#10b981"),
    glow: AdditiveBlending,
    halo: 0.12,
  },
  light: {
    ink: new Color("#7d8ba0"),
    signal: new Color("#0369a1"),
    hot: new Color("#0891b2"),
    confirmed: new Color("#047857"),
    glow: NormalBlending,
    halo: 0.045,
  },
} as const;

/* Pulse rhythm: travel time along the route, then rest, in seconds. */
const PULSE_TRAVEL = 2.8;
const PULSE_REST = 2.2;

const FIELD_VERT = /* glsl */ `
  uniform float uPixelRatio;
  uniform float uDraw;
  uniform float uTime;
  uniform float uPulse;
  uniform vec3 uPointer;
  uniform float uPointerAmt;
  attribute float aSeed;
  attribute float aNear;
  attribute float aRouteT;
  varying float vLit;
  varying float vGlow;
  varying float vSeed;
  varying float vFade;
  void main() {
    vec3 p = position;
    // A slow swell travels across the sheet.
    p.y += sin(p.x * 0.55 + uTime * 0.35) * cos(p.z * 0.6 - uTime * 0.27) * 0.06;
    // Lens: records under the cursor lift toward the viewer.
    float lens = (1.0 - smoothstep(0.0, 1.5, distance(p.xz, uPointer.xz))) * uPointerAmt;
    p.y += lens * lens * 0.22;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float reached = smoothstep(aRouteT, aRouteT + 0.05, uDraw);
    float wake = exp(-pow((uPulse - aRouteT) * 13.0, 2.0)) * aNear * reached;
    vLit = aNear * reached;
    vGlow = max(wake, lens * 0.75);
    vSeed = aSeed * (0.8 + 0.2 * sin(uTime * (0.5 + aSeed * 1.3) + aSeed * 40.0));
    vFade = smoothstep(16.0, 7.5, -mv.z);
    float size = mix(1.5, 2.5, aSeed) + vLit * 1.4 + vGlow * 2.2;
    gl_PointSize = size * uPixelRatio * (9.5 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FIELD_FRAG = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uSignal;
  uniform vec3 uHot;
  varying float vLit;
  varying float vGlow;
  varying float vSeed;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float edge = 1.0 - smoothstep(0.36, 0.5, d);
    vec3 col = mix(uBase, uSignal, clamp(vLit * 0.85 + vGlow, 0.0, 1.0));
    col = mix(col, uHot, vGlow * 0.45);
    float alpha = edge * mix(0.3 + vSeed * 0.24, 0.95, clamp(max(vLit, vGlow), 0.0, 1.0)) * vFade;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

/* Drawn twice: a crisp core, then a wide soft halo (additive, no post pass). */
const ROUTE_VERT = /* glsl */ `
  uniform float uPixelRatio;
  uniform float uDraw;
  uniform float uPulse;
  uniform float uSize;
  attribute float aT;
  varying float vVisible;
  varying float vHead;
  varying float vPulse;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vVisible = step(aT, uDraw);
    vHead = 1.0 - smoothstep(0.0, 0.035, abs(uDraw - aT));
    float behind = uPulse - aT;
    vPulse = exp(-max(behind, 0.0) * 16.0) * smoothstep(-0.008, 0.0, behind);
    float size = uSize * (1.0 + vHead * 1.4 + vPulse * 1.3);
    gl_PointSize = size * uPixelRatio * (9.5 / -mv.z) * vVisible;
    gl_Position = projectionMatrix * mv;
  }
`;

const ROUTE_FRAG = /* glsl */ `
  uniform vec3 uSignal;
  uniform vec3 uHot;
  uniform float uSoft;
  uniform float uAlpha;
  varying float vVisible;
  varying float vHead;
  varying float vPulse;
  void main() {
    if (vVisible < 0.5) discard;
    vec2 c = gl_PointCoord - 0.5;
    float core = 1.0 - smoothstep(0.34, 0.5, length(c));
    float halo = exp(-dot(c, c) * 14.0);
    float shape = mix(core, halo, uSoft);
    float energy = clamp(vHead * 0.5 + vPulse, 0.0, 1.0);
    vec3 col = mix(uSignal, uHot, energy * 0.7);
    float a = shape * uAlpha * mix(1.0 - uSoft * 0.65, 1.0 + uSoft * 2.2, energy);
    if (a < 0.004) discard;
    gl_FragColor = vec4(col, a);
  }
`;

const MARK_VERT = /* glsl */ `
  uniform float uPixelRatio;
  uniform float uSize;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * uPixelRatio * (9.5 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const MARK_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uRing;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float disc = 1.0 - smoothstep(0.2, 0.26, d);
    float ring = (1.0 - smoothstep(0.44, 0.5, d)) * smoothstep(0.36, 0.42, d) * uRing;
    float a = max(disc, ring * 0.7) * uOpacity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

/* One expanding ring from the credit mark when a pulse arrives. */
const RIPPLE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uProgress;
  uniform float uOpacity;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float r = mix(0.06, 0.48, uProgress);
    float ring = exp(-pow((d - r) * 38.0, 2.0));
    float a = ring * (1.0 - uProgress) * uOpacity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

export interface RouteFieldOptions {
  /** Which palette to paint with. */
  theme: "dark" | "light";
  /** Fewer points and a lower pixel-ratio cap on small or low-power screens. */
  compact: boolean;
  /** Render a single, complete frame and never animate. */
  still: boolean;
}

export class RouteFieldScene {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(34, 1, 0.1, 60);
  private group = new Group();
  private fieldMat: ShaderMaterial;
  private routeMat: ShaderMaterial;
  private haloMat: ShaderMaterial;
  private endMat: ShaderMaterial;
  private rippleMat: ShaderMaterial;
  private disposables: { dispose(): void }[] = [];

  private intro = 0;
  private scroll = 0;
  private target = { x: 0, y: 0 };
  private current = { x: 0, y: 0 };
  private frame = 0;
  private lastTime = 0;
  private active = true;

  // Ambient life (never runs in still mode)
  private time = 0;
  private pulseClock = 0;
  private lensTarget = { x: 0, y: 0, on: 0 };
  private lens = new Vector3(0, 0, 0);
  private lensAmt = 0;
  private raycaster = new Raycaster();
  private plane = new Plane(new Vector3(0, 1, 0), 0);
  private hit = new Vector3();
  private inv = new Matrix4();
  private ndc = new Vector2();
  private shared: {
    uPixelRatio: { value: number };
    uTime: { value: number };
    uPulse: { value: number };
    uDraw: { value: number };
  };

  private ink: Color;
  private confirmed: Color;

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: RouteFieldOptions,
  ) {
    const pal = PALETTES[opts.theme];
    const INK = pal.ink;
    const SIGNAL = pal.signal;
    const SIGNAL_HOT = pal.hot;
    const CONFIRMED = pal.confirmed;
    this.ink = INK;
    this.confirmed = CONFIRMED;
    this.renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
    });
    this.renderer.setClearColor(0x000000, 0);
    const dpr = Math.min(window.devicePixelRatio || 1, opts.compact ? 1.5 : 1.75);
    this.renderer.setPixelRatio(dpr);

    this.camera.position.set(0.3, 5.4, 7.8);
    this.camera.lookAt(-0.1, 0.5, -0.2);

    const curve = new CatmullRomCurve3(
      [
        new Vector3(-4.6, 0.0, -3.1),
        new Vector3(-3.1, 0.0, -1.2),
        new Vector3(-1.4, 0.0, -2.3),
        new Vector3(0.2, 0.0, -0.4),
        new Vector3(1.9, 0.0, -1.5),
        new Vector3(3.0, 0.0, 0.6),
        new Vector3(4.3, 0.0, 1.9),
      ],
      false,
      "centripetal",
    );
    const sheetY = (x: number, z: number) => -0.012 * x * x + 0.05 * z;

    // Route samples
    const routeCount = opts.compact ? 260 : 440;
    const routePts = curve.getSpacedPoints(routeCount - 1);
    const routePos = new Float32Array(routeCount * 3);
    const routeT = new Float32Array(routeCount);
    routePts.forEach((p, i) => {
      routePos.set([p.x, sheetY(p.x, p.z) + 0.03, p.z], i * 3);
      routeT[i] = i / (routeCount - 1);
    });

    // Field: jittered grid on a gently curved sheet
    const step = opts.compact ? 0.34 : 0.235;
    const xs = [] as number[];
    for (let x = -5.8; x <= 5.8; x += step) xs.push(x);
    const zs = [] as number[];
    for (let z = -4.2; z <= 3.2; z += step) zs.push(z);
    const n = xs.length * zs.length;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    const near = new Float32Array(n);
    const rt = new Float32Array(n);
    let rand = 1337;
    const rnd = () => (rand = (rand * 16807) % 2147483647) / 2147483647;
    let k = 0;
    for (const x0 of xs) {
      for (const z0 of zs) {
        const x = x0 + (rnd() - 0.5) * step * 0.5;
        const z = z0 + (rnd() - 0.5) * step * 0.5;
        pos.set([x, sheetY(x, z), z], k * 3);
        seed[k] = rnd();
        // distance to the route (sampled), and where along the route that is
        let best = Infinity;
        let bestT = 1;
        for (let i = 0; i < routeCount; i += 4) {
          const dx = routePos[i * 3] - x;
          const dz = routePos[i * 3 + 2] - z;
          const d = dx * dx + dz * dz;
          if (d < best) {
            best = d;
            bestT = routeT[i];
          }
        }
        const dist = Math.sqrt(best);
        near[k] = 1 - Math.min(1, dist / 0.7);
        near[k] = near[k] * near[k];
        rt[k] = bestT;
        k++;
      }
    }

    const fieldGeo = new BufferGeometry();
    fieldGeo.setAttribute("position", new BufferAttribute(pos, 3));
    fieldGeo.setAttribute("aSeed", new BufferAttribute(seed, 1));
    fieldGeo.setAttribute("aNear", new BufferAttribute(near, 1));
    fieldGeo.setAttribute("aRouteT", new BufferAttribute(rt, 1));
    const uPixelRatio = { value: this.renderer.getPixelRatio() };
    this.shared = {
      uPixelRatio,
      uTime: { value: 0 },
      uPulse: { value: -1 },
      uDraw: { value: 0 },
    };
    this.fieldMat = new ShaderMaterial({
      vertexShader: FIELD_VERT,
      fragmentShader: FIELD_FRAG,
      uniforms: {
        ...this.shared,
        uPointer: { value: this.lens },
        uPointerAmt: { value: 0 },
        uBase: { value: INK },
        uSignal: { value: SIGNAL },
        uHot: { value: SIGNAL_HOT },
      },
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
    });
    this.group.add(new Points(fieldGeo, this.fieldMat));

    const routeGeo = new BufferGeometry();
    routeGeo.setAttribute("position", new BufferAttribute(routePos, 3));
    routeGeo.setAttribute("aT", new BufferAttribute(routeT, 1));
    const routeLayer = (size: number, soft: number, alpha: number) =>
      new ShaderMaterial({
        vertexShader: ROUTE_VERT,
        fragmentShader: ROUTE_FRAG,
        uniforms: {
          ...this.shared,
          uSize: { value: size },
          uSoft: { value: soft },
          uAlpha: { value: alpha },
          uSignal: { value: SIGNAL },
          uHot: { value: SIGNAL_HOT },
        },
        transparent: true,
        depthWrite: false,
        blending: pal.glow,
      });
    // Halo first, so the crisp core sits on top of its own glow.
    this.haloMat = routeLayer(opts.compact ? 11 : 15, 1, pal.halo);
    this.routeMat = routeLayer(2.6, 0, 0.95);
    this.group.add(new Points(routeGeo, this.haloMat));
    this.group.add(new Points(routeGeo, this.routeMat));

    // Start (the holding) and end (credit) marks
    const mark = (p: Vector3, color: Color, size: number, ring: number) => {
      const g = new BufferGeometry();
      g.setAttribute(
        "position",
        new BufferAttribute(new Float32Array([p.x, sheetY(p.x, p.z) + 0.04, p.z]), 3),
      );
      const m = new ShaderMaterial({
        vertexShader: MARK_VERT,
        fragmentShader: MARK_FRAG,
        uniforms: {
          uPixelRatio,
          uSize: { value: size },
          uColor: { value: color.clone() },
          uOpacity: { value: 1 },
          uRing: { value: ring },
        },
        transparent: true,
        depthWrite: false,
      });
      this.group.add(new Points(g, m));
      this.disposables.push(g, m);
      return m;
    };
    mark(routePts[0], SIGNAL, 14, 1);
    const end = routePts[routeCount - 1];
    this.endMat = mark(end, INK, 16, 1);

    const rippleGeo = new BufferGeometry();
    rippleGeo.setAttribute(
      "position",
      new BufferAttribute(new Float32Array([end.x, sheetY(end.x, end.z) + 0.04, end.z]), 3),
    );
    this.rippleMat = new ShaderMaterial({
      vertexShader: MARK_VERT,
      fragmentShader: RIPPLE_FRAG,
      uniforms: {
        uPixelRatio,
        uSize: { value: 120 },
        uColor: { value: CONFIRMED },
        uProgress: { value: 1 },
        uOpacity: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: pal.glow,
    });
    this.group.add(new Points(rippleGeo, this.rippleMat));

    // Framed (solved numerically) so the whole route, holding to credit,
    // sits inside the canvas on both desktop and phone aspect ratios.
    this.group.position.set(-1.4, 0, -1.6);
    this.scene.add(this.group);
    this.disposables.push(
      fieldGeo,
      routeGeo,
      rippleGeo,
      this.fieldMat,
      this.routeMat,
      this.haloMat,
      this.rippleMat,
      this.renderer,
    );
  }

  resize(width: number, height: number) {
    if (width === 0 || height === 0) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    // Keep the field framed on tall, narrow canvases.
    this.camera.fov = width / height < 1 ? 46 : 34;
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }

  /** 0..1 authored entrance of the route. */
  setIntro(v: number) {
    this.intro = v;
    this.requestRender();
  }

  /** 0..1 progress of the hero leaving the viewport. */
  setScroll(v: number) {
    this.scroll = v;
    this.requestRender();
  }

  /** Normalised pointer position, -1..1. */
  setPointer(x: number, y: number) {
    this.target.x = x;
    this.target.y = y;
    this.requestRender();
  }

  /**
   * Cursor position over the canvas in normalised device coordinates
   * (-1..1, y up), and whether it is over the canvas at all. Drives the lens.
   */
  setLens(x: number, y: number, inside: boolean) {
    this.lensTarget.x = x;
    this.lensTarget.y = y;
    this.lensTarget.on = inside ? 1 : 0;
    this.requestRender();
  }

  setActive(active: boolean) {
    this.active = active;
    if (active) this.requestRender();
  }

  requestRender = () => {
    if (!this.active || this.frame) return;
    this.lastTime = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  };

  private tick = (now: number) => {
    this.frame = 0;
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    const still = this.opts.still;

    // Critically damped approach to the pointer target: no overshoot, no drift.
    const a = still ? 1 : 1 - Math.exp(-dt * 6);
    this.current.x += (this.target.x - this.current.x) * a;
    this.current.y += (this.target.y - this.current.y) * a;

    const draw = still ? 1 : this.intro;
    this.shared.uDraw.value = draw;
    const arrived = Math.max(0, Math.min(1, (draw - 0.97) / 0.03));
    (this.endMat.uniforms.uColor.value as Color).copy(this.ink).lerp(this.confirmed, arrived);

    this.group.rotation.y = -0.2 + this.current.x * 0.07 + this.scroll * 0.06;
    this.group.rotation.x = this.current.y * 0.035;
    this.camera.position.z = 7.8 - this.scroll * 0.9;

    if (!still) {
      this.time += dt;
      this.shared.uTime.value = this.time;

      // Pulses start once the authored entrance has drawn the route.
      if (this.intro >= 0.99) {
        this.pulseClock = (this.pulseClock + dt) % (PULSE_TRAVEL + PULSE_REST);
        const p = this.pulseClock / PULSE_TRAVEL;
        // The head runs a little past the drawn end so the tail clears it.
        this.shared.uPulse.value = p <= 1 ? -0.04 + p * (draw + 0.1) : -1;
        // The ripple follows the pulse's arrival at credit, only when the route is complete.
        const r = (this.pulseClock - PULSE_TRAVEL * (draw / (draw + 0.1))) / 1.6;
        this.rippleMat.uniforms.uProgress.value = Math.max(0, Math.min(1, r));
        this.rippleMat.uniforms.uOpacity.value = r > 0 && r < 1 ? arrived * 0.9 : 0;
      }

      // Lens: project the cursor onto the sheet, in the group's local space.
      const la = 1 - Math.exp(-dt * 8);
      this.lensAmt += (this.lensTarget.on - this.lensAmt) * la;
      if (this.lensTarget.on) {
        this.group.updateMatrixWorld();
        this.ndc.set(this.lensTarget.x, this.lensTarget.y);
        this.raycaster.setFromCamera(this.ndc, this.camera);
        this.raycaster.ray.applyMatrix4(this.inv.copy(this.group.matrixWorld).invert());
        if (this.raycaster.ray.intersectPlane(this.plane, this.hit)) {
          this.lens.lerp(this.hit, la);
        }
      }
      this.fieldMat.uniforms.uPointerAmt.value = this.lensAmt;
    }

    this.renderer.render(this.scene, this.camera);
    // Still mode renders on demand only; otherwise the field breathes while visible.
    if (!still && this.active) this.requestRender();
  };

  dispose() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.disposables.forEach((d) => d.dispose());
    this.renderer.forceContextLoss();
  }
}

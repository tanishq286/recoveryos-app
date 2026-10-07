import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  Group,
  NormalBlending,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLRenderer,
} from "three";

/*
 * The record field and the route through it.
 *
 * A still field of points stands for the registry. A route draws from one
 * holding (left, deep) to credit (right, near); points within its reach light
 * as it passes, and the end point turns mint only once the route arrives.
 * Nothing moves on its own: frames render only while the draw, the scroll or
 * the pointer-driven camera is still settling (render on demand).
 */

const INK = new Color("#8699a0");
const SIGNAL = new Color("#7cb8ff");
const CONFIRMED = new Color("#5cd3b4");

const FIELD_VERT = /* glsl */ `
  uniform float uPixelRatio;
  uniform float uDraw;
  attribute float aSeed;
  attribute float aNear;
  attribute float aRouteT;
  varying float vLit;
  varying float vSeed;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float reached = smoothstep(aRouteT, aRouteT + 0.05, uDraw);
    vLit = aNear * reached;
    vSeed = aSeed;
    float size = mix(1.3, 2.2, aSeed) + vLit * 1.2;
    gl_PointSize = size * uPixelRatio * (9.5 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FIELD_FRAG = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uSignal;
  varying float vLit;
  varying float vSeed;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float edge = 1.0 - smoothstep(0.38, 0.5, d);
    vec3 col = mix(uBase, uSignal, vLit * 0.85);
    float alpha = edge * mix(0.24 + vSeed * 0.18, 0.95, vLit);
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

const ROUTE_VERT = /* glsl */ `
  uniform float uPixelRatio;
  uniform float uDraw;
  attribute float aT;
  varying float vVisible;
  varying float vHead;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vVisible = step(aT, uDraw);
    vHead = 1.0 - smoothstep(0.0, 0.035, abs(uDraw - aT));
    float size = 2.3 + vHead * 3.2;
    gl_PointSize = size * uPixelRatio * (9.5 / -mv.z) * vVisible;
    gl_Position = projectionMatrix * mv;
  }
`;

const ROUTE_FRAG = /* glsl */ `
  uniform vec3 uSignal;
  varying float vVisible;
  varying float vHead;
  void main() {
    if (vVisible < 0.5) discard;
    vec2 c = gl_PointCoord - 0.5;
    float edge = 1.0 - smoothstep(0.36, 0.5, length(c));
    gl_FragColor = vec4(mix(uSignal, vec3(0.93), vHead * 0.35), edge * 0.95);
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

export interface RouteFieldOptions {
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
  private endMat: ShaderMaterial;
  private disposables: { dispose(): void }[] = [];

  private intro = 0;
  private scroll = 0;
  private target = { x: 0, y: 0 };
  private current = { x: 0, y: 0 };
  private frame = 0;
  private lastTime = 0;
  private active = true;

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: RouteFieldOptions,
  ) {
    this.renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
    });
    this.renderer.setClearColor(0x000000, 0);
    const dpr = Math.min(window.devicePixelRatio || 1, opts.compact ? 1.5 : 1.75);
    this.renderer.setPixelRatio(dpr);

    this.camera.position.set(0.3, 5.4, 7.4);
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
    this.fieldMat = new ShaderMaterial({
      vertexShader: FIELD_VERT,
      fragmentShader: FIELD_FRAG,
      uniforms: {
        uPixelRatio,
        uDraw: { value: 0 },
        uBase: { value: INK },
        uSignal: { value: SIGNAL },
      },
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
    });
    this.group.add(new Points(fieldGeo, this.fieldMat));

    const routeGeo = new BufferGeometry();
    routeGeo.setAttribute("position", new BufferAttribute(routePos, 3));
    routeGeo.setAttribute("aT", new BufferAttribute(routeT, 1));
    this.routeMat = new ShaderMaterial({
      vertexShader: ROUTE_VERT,
      fragmentShader: ROUTE_FRAG,
      uniforms: { uPixelRatio, uDraw: { value: 0 }, uSignal: { value: SIGNAL } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
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
    this.endMat = mark(routePts[routeCount - 1], INK, 16, 1);

    this.scene.add(this.group);
    this.disposables.push(fieldGeo, routeGeo, this.fieldMat, this.routeMat, this.renderer);
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

    // Critically damped approach to the pointer target: no overshoot, no drift.
    const a = this.opts.still ? 1 : 1 - Math.exp(-dt * 6);
    this.current.x += (this.target.x - this.current.x) * a;
    this.current.y += (this.target.y - this.current.y) * a;
    const settling =
      Math.abs(this.target.x - this.current.x) > 0.0005 ||
      Math.abs(this.target.y - this.current.y) > 0.0005;

    const draw = this.opts.still ? 1 : Math.min(1, 0.64 * this.intro + 0.36 * this.scroll);
    this.fieldMat.uniforms.uDraw.value = draw;
    this.routeMat.uniforms.uDraw.value = draw;
    const arrived = Math.max(0, Math.min(1, (draw - 0.97) / 0.03));
    (this.endMat.uniforms.uColor.value as Color).copy(INK).lerp(CONFIRMED, arrived);

    this.group.rotation.y = -0.1 + this.current.x * 0.07 + this.scroll * 0.06;
    this.group.rotation.x = this.current.y * 0.035;
    this.camera.position.z = 7.4 - this.scroll * 0.9;

    this.renderer.render(this.scene, this.camera);
    if (settling && this.active) this.requestRender();
  };

  dispose() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.disposables.forEach((d) => d.dispose());
    this.renderer.forceContextLoss();
  }
}

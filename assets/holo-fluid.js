/* HoloFluid — iridescent flowing background engine (WebGL).
   Domain-warped fbm noise mapped to a cosine iridescent palette,
   with a directional "wave" bias, a sweeping "surge" used for the
   surf pop-up / cut-back choreography, and a mouse glint.

   Usage:
     const fx = new HoloFluid(canvas, {
       palette: [[..A..],[..B..],[..C..],[..D..]], // cosine palette vec3s
       speed: 0.5, warp: 1.0, bright: 1.0, sat: 1.0, contrast: 1.0,
       wave: 0.0, scale: 0.65, tint:[r,g,b], tintAmt:0.0, mouse:true
     });
     fx.surge(0.0..1.0)   // push the sweeping crest (animate this for snap)
*/
(function () {
  const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p,0.0,1.0); }`;

  const FRAG = `precision highp float;
  uniform vec2  u_res;
  uniform float u_time;
  uniform vec2  u_mouse;
  uniform float u_mouseOn;
  uniform float u_speed;
  uniform float u_warp;
  uniform float u_bright;
  uniform float u_sat;
  uniform float u_contrast;
  uniform float u_wave;
  uniform float u_surge;
  uniform float u_freq;
  uniform vec3  cA, cB, cC, cD;
  uniform vec3  u_tint;
  uniform float u_tintAmt;

  float hash(vec2 p){
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 6; i++){
      v += a * vnoise(p);
      p = m * p;
      a *= 0.5;
    }
    return v;
  }

  void main(){
    vec2 uv = gl_FragCoord.xy / u_res;
    vec2 p  = uv;
    p.x *= u_res.x / u_res.y;
    float t = u_time * u_speed;

    // mouse influence: gentle pull on the flow + a soft glint
    vec2 mp = u_mouse;
    mp.x *= u_res.x / u_res.y;
    float md = distance(p, mp);
    vec2 pull = (p - mp) * u_mouseOn * 0.25 * exp(-md * 2.0);

    // domain warp layer 1 — large flowing sheets, biased vertically by wave
    vec2 q = vec2(
      fbm(p * (2.0 * u_freq) + vec2(0.0, t * 0.20) + pull),
      fbm(p * (2.0 * u_freq) + vec2(5.2, 1.3) - vec2(t * 0.15, t * 0.05 * u_wave))
    );

    // sweeping crest — the surge term whips the field (cut-back / snap)
    float crest = u_surge * (1.2 - p.y) ;
    vec2 r = vec2(
      fbm(p * (3.0 * u_freq) + u_warp * q + vec2(1.7, 9.2) + vec2(t * 0.12, 0.0)),
      fbm(p * (3.0 * u_freq) + u_warp * q + vec2(8.3, 2.8) - vec2(crest, t * 0.14 + u_surge * 1.5))
    );

    float f = fbm(p * (2.6 * u_freq) + u_warp * r + vec2(0.0, -t * 0.10 * (1.0 + u_wave)));

    // iridescent color — cosine palette over flow value + spatial phase
    float phase = f * 1.25 + length(r) * 0.65 + (q.x - q.y) * 0.55;
    vec3 col = cA + cB * cos(6.28318530718 * (cC * phase + cD));

    // specular-ish highlights where the flow folds
    float hi = smoothstep(0.55, 0.96, f + 0.30 * length(q));
    col += hi * 0.55;

    // mouse glint
    col += u_mouseOn * exp(-md * md * 7.0) * 0.45 * vec3(1.0, 0.97, 0.92);

    // saturation, tint, brightness, contrast
    col = mix(vec3(dot(col, vec3(0.333))), col, u_sat);
    col = mix(col, u_tint, u_tintAmt);
    col *= u_bright;
    col = pow(max(col, 0.0), vec3(u_contrast));

    gl_FragColor = vec4(col, 1.0);
  }`;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("HoloFluid shader:", gl.getShaderInfoLog(s));
    }
    return s;
  }

  const DEFAULT_PALETTE = [
    [0.62, 0.62, 0.68],
    [0.38, 0.34, 0.36],
    [1.00, 1.00, 1.00],
    [0.00, 0.20, 0.55],
  ];

  class HoloFluid {
    constructor(canvas, opts) {
      opts = opts || {};
      this.canvas = canvas;
      this.opts = opts;
      this.scale = opts.scale || 0.6;
      const gl = canvas.getContext("webgl", {
        antialias: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
      });
      if (!gl) { this.dead = true; return; }
      this.gl = gl;
      (window.__holos || (window.__holos = [])).push(this);

      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      gl.useProgram(prog);
      this.prog = prog;

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      this.u = {};
      ["u_res","u_time","u_mouse","u_mouseOn","u_speed","u_warp","u_bright",
       "u_sat","u_contrast","u_wave","u_surge","u_freq","cA","cB","cC","cD","u_tint","u_tintAmt"]
        .forEach((n) => (this.u[n] = gl.getUniformLocation(prog, n)));

      const pal = opts.palette || DEFAULT_PALETTE;
      gl.uniform3fv(this.u.cA, pal[0]);
      gl.uniform3fv(this.u.cB, pal[1]);
      gl.uniform3fv(this.u.cC, pal[2]);
      gl.uniform3fv(this.u.cD, pal[3]);
      gl.uniform1f(this.u.u_speed, opts.speed != null ? opts.speed : 0.5);
      gl.uniform1f(this.u.u_warp, opts.warp != null ? opts.warp : 1.0);
      gl.uniform1f(this.u.u_bright, opts.bright != null ? opts.bright : 1.0);
      gl.uniform1f(this.u.u_sat, opts.sat != null ? opts.sat : 1.0);
      gl.uniform1f(this.u.u_contrast, opts.contrast != null ? opts.contrast : 1.0);
      gl.uniform1f(this.u.u_wave, opts.wave != null ? opts.wave : 0.0);
      gl.uniform1f(this.u.u_surge, 0.0);
      gl.uniform1f(this.u.u_freq, opts.freq != null ? opts.freq : 1.0);
      gl.uniform3fv(this.u.u_tint, opts.tint || [1, 1, 1]);
      gl.uniform1f(this.u.u_tintAmt, opts.tintAmt != null ? opts.tintAmt : 0.0);
      gl.uniform2f(this.u.u_mouse, 0.5, 0.5);
      gl.uniform1f(this.u.u_mouseOn, opts.mouse === false ? 0.0 : 1.0);

      this._mouse = [0.5, 0.5];
      this._mouseT = [0.5, 0.5];
      this._surge = 0;
      this._surgeT = 0;
      this.t0 = performance.now();
      this.visible = true;
      this._frame = 0;
      this.timeOffset = opts.timeOffset || 0;

      this.resize();
      window.addEventListener("resize", () => this.resize());

      if (opts.mouse !== false) {
        window.addEventListener("pointermove", (e) => {
          const r = canvas.getBoundingClientRect();
          this._mouseT = [
            (e.clientX - r.left) / r.width,
            1.0 - (e.clientY - r.top) / r.height,
          ];
        });
      }

      this._loop = this._loop.bind(this);
      requestAnimationFrame(this._loop);
    }

    resize() {
      const gl = this.gl; if (!gl) return;
      const w = Math.max(1, Math.floor(this.canvas.clientWidth * this.scale));
      const h = Math.max(1, Math.floor(this.canvas.clientHeight * this.scale));
      this.canvas.width = w; this.canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(this.u.u_res, w, h);
    }

    surge(v) { this._surgeT = v; }
    set(name, v) { if (this.u[name]) this.gl.uniform1f(this.u[name], v); }

    // draw a single frame at the current (or forced) time — used by the rAF
    // loop and by capture tooling when the tab is hidden (rAF paused).
    step(forceT) {
      if (this.dead) return;
      const gl = this.gl;
      const t = forceT != null ? forceT : (performance.now() - this.t0) / 1000 + this.timeOffset;
      this._mouse[0] += (this._mouseT[0] - this._mouse[0]) * 0.06;
      this._mouse[1] += (this._mouseT[1] - this._mouse[1]) * 0.06;
      this._surge += (this._surgeT - this._surge) * 0.08;
      gl.uniform1f(this.u.u_time, t);
      gl.uniform2f(this.u.u_mouse, this._mouse[0], this._mouse[1]);
      gl.uniform1f(this.u.u_surge, this._surge);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    _loop() {
      requestAnimationFrame(this._loop);
      if (this.dead) return;
      // throttled visibility via rect (IntersectionObserver is unreliable in some iframes)
      if ((this._frame++ % 12) === 0) {
        const r = this.canvas.getBoundingClientRect();
        this.visible = r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
      }
      if (!this.visible) return;
      this.step();
    }
  }

  // Force one frame on every instance (capture helper for hidden tabs).
  window.__renderHolos = function (t) {
    (window.__holos || []).forEach((h) => h.step(t));
  };

  window.HoloFluid = HoloFluid;
})();

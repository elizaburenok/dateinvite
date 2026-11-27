import { useEffect, useRef, useState } from 'react';
import textureUrl from '../assets/pastel-background.png';
import '../styles/pastel-background.css';

const vertexSource = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = (a_position + 1.0) * 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

// The original Figma image supplies the palette and grain. Only the texture
// coordinates move: no hue cycling, flashing noise or hard loop boundary.
const fragmentSource = `
precision highp float;
uniform sampler2D u_image;
uniform vec2 u_cover;
uniform float u_time;
uniform float u_motion;
varying vec2 v_uv;
void main() {
  vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);
  float phase = u_time * 0.26179939; // 24-second seamless cycle
  vec2 drift = vec2(
    sin(uv.y * 6.283185 + phase) - sin(uv.y * 6.283185),
    cos(uv.x * 6.283185 + phase) - cos(uv.x * 6.283185)
  );
  // Fade distortion at the edges so the frame stays still.
  vec2 edge = sin(uv * 3.141593);
  uv += drift * edge * vec2(0.055, 0.045) * u_motion;
  uv = (uv - 0.5) * u_cover + 0.5;
  gl_FragColor = texture2D(u_image, uv);
}`;

export function PastelBackground({ paused = false, original = false }: { paused?: boolean; original?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const options = useRef({ paused, original });
  options.current = { paused, original };
  const redraw = useRef<() => void>(() => {});
  const [available, setAvailable] = useState(false);

  useEffect(() => { redraw.current(); }, [paused, original]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const gl = element.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
    if (!gl) return;
    const shaders: WebGLShader[] = [];
    const program = gl.createProgram();
    if (!program) return;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Shader allocation failed');
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Shader compilation failed');
      gl.attachShader(program, shader);
    };
    try {
      compile(gl.VERTEX_SHADER, vertexSource);
      compile(gl.FRAGMENT_SHADER, fragmentSource);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Shader link failed');
    } catch {
      shaders.forEach(shader => gl.deleteShader(shader));
      gl.deleteProgram(program);
      return; // The original image remains visible if WebGL is unavailable.
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(program, 'u_image'), 0);
    const cover = gl.getUniformLocation(program, 'u_cover');
    const time = gl.getUniformLocation(program, 'u_time');
    const motion = gl.getUniformLocation(program, 'u_motion');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const image = new Image();
    let disposed = false;
    let ready = false;
    let frame = 0;
    let clock = 0;
    let previous = 0;
    let lastDraw = 0;
    let dirty = true;
    let revealed = false;
    let lastOriginal = original;
    const resize = () => {
      const rect = element.getBoundingClientRect();
      const scale = Math.min(window.devicePixelRatio || 1, 1.5);
      element.width = Math.max(1, Math.round(rect.width * scale));
      element.height = Math.max(1, Math.round(rect.height * scale));
      gl.viewport(0, 0, element.width, element.height);
      const ratio = element.width / element.height;
      const imageRatio = image.naturalWidth / image.naturalHeight || ratio;
      gl.uniform2f(cover, Math.min(1, ratio / imageRatio), Math.min(1, imageRatio / ratio));
      dirty = true;
    };
    const tick = (now: number) => {
      frame = 0;
      if (disposed || document.hidden) return;
      const elapsed = previous ? Math.min(now - previous, 100) : 0;
      previous = now;
      const moving = !options.current.paused && !options.current.original && !reducedMotion.matches;
      if (moving) clock += elapsed / 1000;
      if (lastOriginal !== options.current.original) dirty = true;
      lastOriginal = options.current.original;
      if (ready && (dirty || (moving && now - lastDraw >= 1000 / 30))) {
        gl.uniform1f(time, clock);
        gl.uniform1f(motion, options.current.original ? 0 : 1);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        if (!revealed) { revealed = true; setAvailable(true); }
        dirty = false;
        lastDraw = now;
      }
      if (ready && moving) frame = requestAnimationFrame(tick);
    };
    const wake = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      dirty = true;
      if (ready && !document.hidden) frame = requestAnimationFrame(tick);
    };
    redraw.current = wake;
    const contextLost = (event: Event) => {
      event.preventDefault();
      ready = false;
      cancelAnimationFrame(frame);
      setAvailable(false);
    };
    image.onload = () => {
      if (disposed) return;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      resize();
      ready = true;
      wake();
    };
    image.src = textureUrl;
    const observer = new ResizeObserver(() => { resize(); wake(); });
    observer.observe(element);
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('pageshow', wake);
    reducedMotion.addEventListener('change', wake);
    element.addEventListener('webglcontextlost', contextLost);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      redraw.current = () => {};
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('pageshow', wake);
      reducedMotion.removeEventListener('change', wake);
      element.removeEventListener('webglcontextlost', contextLost);
      image.onload = null;
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      shaders.forEach(shader => gl.deleteShader(shader));
      gl.deleteProgram(program);
    };
  }, []);

  return <div className="pastel-background" aria-hidden="true">
    <img src={textureUrl} alt="" />
    <canvas ref={canvas} style={{ opacity: available ? 1 : 0 }} />
  </div>;
}

// 夜空の星のまたたきと、ゆっくり流れる光の粒。
// 投稿数が増えるほど星と光の粒が増える(setLiveliness)。

interface Star {
  x: number; // 0〜1
  y: number;
  radius: number;
  phase: number;
  speed: number;
  hue: string;
}

interface Particle {
  x: number; // 0〜1
  y: number;
  radius: number;
  vx: number;
  vy: number;
  phase: number;
  hue: string;
}

const STAR_COLORS = ['255, 255, 255', '255, 236, 190', '205, 224, 255'];
const PARTICLE_COLORS = ['255, 233, 176', '255, 255, 255', '207, 228, 255'];

const BASE_STARS = 110;
const MAX_EXTRA_STARS = 130;
const BASE_PARTICLES = 16;
const MAX_EXTRA_PARTICLES = 34;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeStar(): Star {
  return {
    x: Math.random(),
    y: Math.random() * 0.9,
    radius: 0.6 + Math.random() * 1.3,
    phase: Math.random() * Math.PI * 2,
    speed: 0.4 + Math.random() * 1.1,
    hue: pick(STAR_COLORS),
  };
}

function makeParticle(): Particle {
  return {
    x: Math.random(),
    y: Math.random(),
    radius: 1 + Math.random() * 2.2,
    vx: (Math.random() - 0.3) * 0.006,
    vy: -(0.004 + Math.random() * 0.008),
    phase: Math.random() * Math.PI * 2,
    hue: pick(PARTICLE_COLORS),
  };
}

export class StarField {
  private ctx: CanvasRenderingContext2D;
  private stars: Star[] = [];
  private particles: Particle[] = [];
  private targetStars = BASE_STARS;
  private targetParticles = BASE_PARTICLES;
  private lastTime = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d context unavailable');
    this.ctx = ctx;
    this.resize();
    while (this.stars.length < this.targetStars) this.stars.push(makeStar());
    while (this.particles.length < this.targetParticles) this.particles.push(makeParticle());
    requestAnimationFrame(this.frame);
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** 投稿数に応じてにぎやかさを調整する */
  setLiveliness(postCount: number): void {
    this.targetStars = BASE_STARS + Math.min(postCount * 3, MAX_EXTRA_STARS);
    this.targetParticles = BASE_PARTICLES + Math.min(postCount, MAX_EXTRA_PARTICLES);
  }

  private frame = (time: number): void => {
    const dt = this.lastTime === 0 ? 16 : Math.min(time - this.lastTime, 64);
    this.lastTime = time;

    // 目標数へ少しずつ増減
    if (this.stars.length < this.targetStars) this.stars.push(makeStar());
    else if (this.stars.length > this.targetStars) this.stars.pop();
    if (this.particles.length < this.targetParticles) this.particles.push(makeParticle());
    else if (this.particles.length > this.targetParticles) this.particles.pop();

    const w = window.innerWidth;
    const h = window.innerHeight;
    const t = time / 1000;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    for (const star of this.stars) {
      const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * star.speed + star.phase));
      ctx.beginPath();
      ctx.fillStyle = `rgba(${star.hue}, ${(twinkle * 0.9).toFixed(3)})`;
      ctx.arc(star.x * w, star.y * h, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    const step = dt / 16.7;
    for (const p of this.particles) {
      p.x += p.vx * 0.01 * step;
      p.y += p.vy * 0.01 * step;
      if (p.y < -0.02 || p.x < -0.02 || p.x > 1.02) {
        Object.assign(p, makeParticle(), { y: 1.02, x: Math.random() });
      }
      const alpha = 0.14 + 0.2 * (0.5 + 0.5 * Math.sin(t * 0.8 + p.phase));
      const px = p.x * w;
      const py = p.y * h;
      const glow = ctx.createRadialGradient(px, py, 0, px, py, p.radius * 4);
      glow.addColorStop(0, `rgba(${p.hue}, ${alpha.toFixed(3)})`);
      glow.addColorStop(1, `rgba(${p.hue}, 0)`);
      ctx.beginPath();
      ctx.fillStyle = glow;
      ctx.arc(px, py, p.radius * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(this.frame);
  };
}

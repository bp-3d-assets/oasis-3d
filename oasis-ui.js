// Power OASIS Core touchscreen: a live drawing of the GX dashboard for the 3D model's display.
// OasisUI.draw(ctx, seconds) paints one frame at 1600 x 1000.
(function () {
  const W = 1600, H = 1000;
  const C = {
    bg: "#0a1220", panel: "#101b2c", panel2: "#132238", edge: "#22344f", text: "#e8f0fb", dim: "#8ea3bf",
    teal: "#2fd0c4", green: "#3ee07a", blue: "#3aa0ff", orange: "#ff9b3d", amber: "#ffcc4d", navy: "#0d1a2e",
  };
  // one dashboard, two products: sidebar logo and header name per variant
  const VARIANTS = { core: ["assets/models/oasis-logo-white.png", "OASIS CORE"], medical: ["assets/models/oasis-logo-medical-white.png", "OASIS MEDICAL"] };
  const logos = {};
  // logos load from wherever this script is hosted (the site itself, or the 3D asset host)
  const BASE = document.currentScript && document.currentScript.src ? document.currentScript.src.replace(/[^/]*$/, "") : "";
  Object.entries(VARIANTS).forEach(([k, [src]]) => { logos[k] = new Image(); logos[k].crossOrigin = "anonymous"; logos[k].src = BASE + src; });

  const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  const card = (ctx, x, y, w, h, hi) => {
    rr(ctx, x, y, w, h, 14); ctx.fillStyle = C.panel; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = hi || C.edge; ctx.stroke();
  };
  const txt = (ctx, s, x, y, size, color, weight = 500, align = "left") => {
    ctx.font = `${weight} ${size}px "Segoe UI", Inter, system-ui, sans-serif`;
    ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = "alphabetic"; ctx.fillText(s, x, y);
  };
  const wave = (t, f, a) => Math.sin(t * f) * a + Math.sin(t * f * 2.3 + 1) * a * 0.4;

  // a power line with dots flowing along it
  const flow = (ctx, pts, color, t, speed = 1, on = true) => {
    ctx.save();
    ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = on ? color : C.edge; ctx.globalAlpha = on ? 0.35 : 0.6;
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    if (!on) { ctx.restore(); return; }
    ctx.globalAlpha = 1; ctx.shadowColor = color; ctx.shadowBlur = 18; ctx.lineWidth = 3; ctx.strokeStyle = color;
    ctx.stroke();
    const seg = []; let total = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d; }
    ctx.fillStyle = "#ffffff";
    for (let k = 0; k < total; k += 70) {
      let d = (k + t * 120 * speed) % total, i = 0;
      while (d > seg[i]) d -= seg[i++];
      const f = d / seg[i], x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f;
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };

  const icon = {
    battery(ctx, x, y, s, c, lvl) {
      ctx.strokeStyle = c; ctx.lineWidth = 3; rr(ctx, x, y + s * 0.15, s * 0.6, s * 0.85, 5); ctx.stroke();
      ctx.fillStyle = c; ctx.fillRect(x + s * 0.2, y + s * 0.05, s * 0.2, s * 0.1);
      const h = s * 0.7 * lvl; ctx.fillRect(x + 6, y + s * 0.15 + s * 0.85 - 6 - h, s * 0.6 - 12, h);
    },
    sun(ctx, x, y, s, c) {
      ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, s * 0.22, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * s * 0.32, y + Math.sin(a) * s * 0.32); ctx.lineTo(x + Math.cos(a) * s * 0.45, y + Math.sin(a) * s * 0.45); ctx.stroke(); }
    },
    tower(ctx, x, y, s, c) {
      ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(x - s * 0.3, y + s * 0.5); ctx.lineTo(x, y - s * 0.5); ctx.lineTo(x + s * 0.3, y + s * 0.5);
      ctx.moveTo(x - s * 0.35, y - s * 0.2); ctx.lineTo(x + s * 0.35, y - s * 0.2);
      ctx.moveTo(x - s * 0.25, y + s * 0.1); ctx.lineTo(x + s * 0.25, y + s * 0.1); ctx.stroke();
    },
    plug(ctx, x, y, s, c) {
      ctx.strokeStyle = c; ctx.lineWidth = 3; rr(ctx, x - s * 0.4, y - s * 0.4, s * 0.8, s * 0.8, 8); ctx.stroke();
      ctx.fillStyle = c; ctx.fillRect(x - s * 0.18, y - s * 0.15, 5, s * 0.2); ctx.fillRect(x + s * 0.12, y - s * 0.15, 5, s * 0.2);
      ctx.beginPath(); ctx.arc(x, y + s * 0.18, 4, 0, Math.PI * 2); ctx.fill();
    },
  };

  function draw(ctx, t, variant = "core") {
    const logo = logos[variant] || logos.core, name = (VARIANTS[variant] || VARIANTS.core)[1];
    // live values
    const v = 53.8 + wave(t, 0.7, 0.08), a = 12.4 + wave(t, 1.1, 0.35), soc = 78 + (Math.sin(t * 0.15) * 0.5 + 0.5) * 1.4;
    const acW = 28 + Math.round(wave(t, 0.9, 3)), outW = 576 + Math.round(wave(t, 0.6, 14)), dcW = 28 + Math.round(wave(t, 1.3, 2));
    const hrs = (6.2 + wave(t, 0.2, 0.05)).toFixed(1);

    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);

    // sidebar
    ctx.fillStyle = C.navy; ctx.fillRect(0, 0, 330, H);
    if (logo.complete && logo.naturalWidth) { const lw = 250, lh = lw * logo.naturalHeight / logo.naturalWidth; ctx.drawImage(logo, 40, 50, lw, lh); }
    const menu = ["Overview", "Power Flow", "Battery", "Inverter / Charger", "AC Loads", "DC Loads", "Solar", "Performance", "Settings", "Alarms"];
    menu.forEach((m, i) => {
      const y = 220 + i * 74;
      if (i === 0) { rr(ctx, 16, y - 40, 298, 62, 10); ctx.fillStyle = "#17406a"; ctx.fill(); ctx.fillStyle = C.blue; ctx.fillRect(16, y - 40, 6, 62); }
      ctx.fillStyle = i === 0 ? C.text : C.dim; ctx.beginPath(); ctx.arc(52, y - 9, 9, 0, Math.PI * 2); ctx.fill();
      txt(ctx, m, 82, y, 24, i === 0 ? C.text : "#c4d2e6", i === 0 ? 600 : 500);
      txt(ctx, "›", 296, y, 28, C.dim, 500, "right");
    });

    // status bar
    const pulse = 0.6 + Math.sin(t * 3) * 0.4;
    ctx.save(); ctx.shadowColor = C.green; ctx.shadowBlur = 20 * pulse; ctx.fillStyle = C.green;
    ctx.beginPath(); ctx.arc(378, 52, 13, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    txt(ctx, "System Online", 405, 58, 30, C.text, 600);
    txt(ctx, "Normal Operation", 405, 90, 20, C.dim);
    txt(ctx, name, 1395, 64, 22, C.text, 600, "right");
    const now = new Date(Date.UTC(2026, 9, 14, 14, 35) + Math.floor(t / 60) * 60000);
    txt(ctx, "Oct 14, 2026", 1570, 54, 19, C.text, 500, "right");
    txt(ctx, now.toISOString().slice(11, 16).replace(/^(\d\d)/, (h) => ((+h + 11) % 12 + 1)) + " PM", 1570, 82, 19, C.dim, 500, "right");
    ctx.strokeStyle = C.blue; ctx.lineWidth = 3;
    [10, 18, 26].forEach((r) => { ctx.beginPath(); ctx.arc(1205, 72, r, -2.4, -0.74); ctx.stroke(); });

    // top cards
    const tops = [360, 670, 980, 1290];
    tops.forEach((x) => card(ctx, x, 120, 290, 180));
    icon.battery(ctx, 385, 145, 70, C.green, soc / 100);
    txt(ctx, "Battery Voltage", 470, 168, 20, C.dim); txt(ctx, v.toFixed(1) + " V", 470, 225, 46, C.text, 700);
    rr(ctx, 385, 255, 190, 14, 7); ctx.fillStyle = C.edge; ctx.fill(); rr(ctx, 385, 255, 190 * soc / 100, 14, 7); ctx.fillStyle = C.green; ctx.fill();
    txt(ctx, Math.round(soc) + "%", 630, 268, 18, C.text, 600, "right");
    txt(ctx, "⇄", 700, 200, 46, C.blue, 600);
    txt(ctx, "Battery Current", 770, 168, 20, C.dim); txt(ctx, a.toFixed(1) + " A", 770, 225, 46, C.text, 700); txt(ctx, "Charging", 770, 270, 22, C.green, 600);
    txt(ctx, "State of Charge", 1125, 152, 20, C.dim, 500, "center");
    ctx.lineWidth = 14; ctx.lineCap = "round"; ctx.strokeStyle = C.edge; ctx.beginPath(); ctx.arc(1125, 228, 54, Math.PI * 0.8, Math.PI * 2.2); ctx.stroke();
    ctx.strokeStyle = C.teal; ctx.beginPath(); ctx.arc(1125, 228, 54, Math.PI * 0.8, Math.PI * (0.8 + 1.4 * soc / 100)); ctx.stroke(); ctx.lineCap = "butt";
    txt(ctx, Math.round(soc) + "%", 1125, 240, 32, C.text, 700, "center"); txt(ctx, "78 Ah / 100 Ah", 1125, 292, 16, C.dim, 500, "center");
    ctx.strokeStyle = C.text; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(1335, 175, 24, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1335, 175); ctx.lineTo(1335 + Math.sin(t) * 16, 175 - Math.cos(t) * 16); ctx.stroke();
    txt(ctx, "Time Remaining", 1375, 168, 20, C.dim); txt(ctx, hrs + " h", 1375, 240, 50, C.text, 700); txt(ctx, "At current load", 1375, 280, 18, C.dim);

    // power-flow diagram
    flow(ctx, [[600, 420], [830, 420]], C.blue, t, 0.7);
    flow(ctx, [[1050, 420], [1330, 420]], C.orange, t, 1.2);
    flow(ctx, [[940, 470], [940, 600]], C.green, t, 0.9);
    flow(ctx, [[600, 640], [790, 640]], C.amber, t, 0, false);
    flow(ctx, [[1090, 640], [1200, 640], [1200, 600], [1330, 600]], C.green, t, 0.8);
    flow(ctx, [[1200, 420], [1200, 600]], C.green, t, 0.5);

    card(ctx, 360, 340, 240, 190); icon.tower(ctx, 410, 405, 70, C.text);
    txt(ctx, "AC Input", 460, 385, 24, C.text, 600); [["118 V", 0], ["0.2 A", 1], [acW + " W", 2]].forEach(([s, i]) => txt(ctx, s, 460, 420 + i * 30, 20, C.dim));
    rr(ctx, 360, 490, 240, 40, 0); ctx.fillStyle = C.panel2; ctx.fill(); txt(ctx, "Utility / Shore Power", 480, 517, 18, C.dim, 500, "center");

    rr(ctx, 830, 360, 220, 120, 12); const g = ctx.createLinearGradient(830, 360, 830, 480); g.addColorStop(0, "#2f7fe8"); g.addColorStop(1, "#1b56b8"); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = "#7fb8ff"; ctx.lineWidth = 2; ctx.stroke();
    txt(ctx, "victron energy", 940, 395, 16, "#d6e7ff", 600, "center"); txt(ctx, "MultiPlus", 940, 435, 30, "#ffffff", 700, "center"); txt(ctx, "48 | 3000 | 35", 940, 466, 18, "#d6e7ff", 500, "center");

    card(ctx, 1330, 340, 240, 190); icon.plug(ctx, 1375, 400, 54, C.text);
    txt(ctx, "AC Output", 1420, 385, 24, C.text, 600); [["120 V", 0], ["4.8 A", 1], [outW + " W", 2]].forEach(([s, i]) => txt(ctx, s, 1420, 420 + i * 30, 20, C.dim));
    rr(ctx, 1340, 487, 220, 34, 8); ctx.fillStyle = "#16492e"; ctx.fill(); txt(ctx, "Supplying Loads", 1450, 511, 18, C.green, 600, "center");

    card(ctx, 360, 560, 240, 190); icon.sun(ctx, 410, 625, 70, C.amber);
    txt(ctx, "Solar", 470, 605, 24, C.text, 600); [["0 W", 0], ["0.0 A", 1], ["0 V", 2]].forEach(([s, i]) => txt(ctx, s, 470, 640 + i * 28, 20, C.dim));
    rr(ctx, 360, 710, 240, 40, 0); ctx.fillStyle = C.panel2; ctx.fill(); txt(ctx, "Not Active", 480, 737, 18, C.dim, 500, "center");

    card(ctx, 790, 590, 300, 150, C.green); icon.battery(ctx, 815, 610, 90, C.green, soc / 100);
    txt(ctx, "Battery", 900, 635, 24, C.text, 600); txt(ctx, v.toFixed(1) + " V", 900, 672, 22, C.text); txt(ctx, a.toFixed(1) + " A", 1070, 672, 22, C.text, 500, "right");
    txt(ctx, "Charging", 900, 710, 22, C.green, 600);
    txt(ctx, "48 V LiFePO4 · 100 Ah", 940, 770, 18, C.dim, 500, "center");

    card(ctx, 1330, 560, 240, 170); txt(ctx, "DC Loads", 1390, 605, 24, C.text, 600);
    txt(ctx, dcW + " W", 1390, 645, 20, C.dim); txt(ctx, "2.3 A", 1390, 675, 20, C.dim);
    rr(ctx, 1340, 690, 220, 32, 8); ctx.fillStyle = "#16492e"; ctx.fill(); txt(ctx, "Active", 1450, 713, 18, C.green, 600, "center");

    // bottom cards
    [["Performance", "Live data, history and trends"], ["System Health", "No alarms"], ["Settings", "Configure system parameters"]].forEach(([h, s], i) => {
      const x = 360 + i * 410; card(ctx, x, 810, 390, 150);
      txt(ctx, h, x + 30, 870, 26, C.text, 600); txt(ctx, s, x + 30, 906, 19, C.dim); txt(ctx, "›", x + 360, 900, 40, C.dim, 500, "right");
    });
    // performance sparkline moves
    ctx.strokeStyle = C.teal; ctx.lineWidth = 3; ctx.beginPath();
    for (let i = 0; i <= 60; i++) { const x = 600 + i * 2.4, y = 935 - (Math.sin((i + t * 8) * 0.25) * 0.5 + 0.5) * 30; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  }


  // OASIS Medical dashboard (neon-blue hospital layout)
  function drawMedical(ctx, t) {
    const M = { bg: "#050d1f", panel: "rgba(10,26,58,0.92)", edge: "#1f5fd6", glow: "#2b7bff", text: "#eaf2ff", dim: "#8fa6c9",
      green: "#2ee07a", teal: "#25d3c3", red: "#e8413a", blue: "#3d8bff" };
    const box = (x, y, w, h, title) => {
      ctx.save(); rr(ctx, x, y, w, h, 16); ctx.fillStyle = M.panel; ctx.fill();
      ctx.shadowColor = M.glow; ctx.shadowBlur = 16; ctx.lineWidth = 2; ctx.strokeStyle = M.edge; ctx.stroke(); ctx.restore();
      if (title) txt(ctx, title, x + 26, y + 44, 26, M.text, 600);
    };
    const v = 51.2 + wave(t, 0.5, 0.05), a = -5.0 + wave(t, 0.9, 0.15), soc = 98 - (Math.sin(t * 0.1) * 0.5 + 0.5) * 0.8;
    const invW = 245 + Math.round(wave(t, 0.8, 6)), outW = 125 + Math.round(wave(t, 1.1, 4));
    const loads = [[0.2, 25], [0.3, 180], [0, 0], [0, 0], [0, 0], [0, 0]].map(([amp, w], i) => [amp, w ? w + Math.round(wave(t + i, 1.3, w * 0.04)) : 0]);

    const bg = ctx.createRadialGradient(800, 200, 50, 800, 400, 1100); bg.addColorStop(0, "#0b2350"); bg.addColorStop(1, M.bg);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // header
    const logo = logos.medical;
    if (logo.complete && logo.naturalWidth) { const lw = 330, lh = lw * logo.naturalHeight / logo.naturalWidth; ctx.drawImage(logo, 120, 18, lw, lh); }
    box(980, 26, 600, 96);
    txt(ctx, "Tue, Oct 14, 2026", 1010, 64, 19, M.dim); txt(ctx, "2:35 PM", 1010, 104, 32, M.text, 700);
    ctx.strokeStyle = M.text; ctx.lineWidth = 3; [10, 18, 26].forEach((r) => { ctx.beginPath(); ctx.arc(1265, 94, r, -2.4, -0.74); ctx.stroke(); });
    ctx.beginPath(); ctx.arc(1340, 64, 11, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(1340, 100, 20, Math.PI, 0); ctx.stroke();
    txt(ctx, "Admin", 1372, 86, 22, M.text, 500);
    ctx.save(); ctx.translate(1530, 74); ctx.rotate(t * 0.3); ctx.fillStyle = M.text;
    for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-5, -24, 10, 12); }
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = M.bg; ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill(); ctx.restore();

    // sidebar
    box(14, 150, 230, 836);
    ["Home", "Power Flow", "Battery", "AC Output", "DC Output", "System", "Alarms", "Settings"].forEach((m, i) => {
      const y = 205 + i * 100;
      if (i === 0) { ctx.save(); rr(ctx, 26, y - 40, 206, 80, 12); ctx.fillStyle = "#1d4fc4"; ctx.shadowColor = M.glow; ctx.shadowBlur = 20; ctx.fill(); ctx.restore(); }
      ctx.strokeStyle = M.text; ctx.lineWidth = 3; rr(ctx, 44, y - 16, 30, 30, 6); ctx.stroke();
      txt(ctx, m, 92, y + 9, 22, M.text, i === 0 ? 700 : 500);
    });

    // system status with a heartbeat trace
    box(260, 150, 810, 160, "System Status");
    ctx.save(); ctx.fillStyle = M.green; ctx.shadowColor = M.green; ctx.shadowBlur = 14 + Math.sin(t * 3) * 8;
    ctx.beginPath(); ctx.arc(298, 238, 13, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    txt(ctx, "Normal Operation", 330, 250, 38, M.teal, 700); txt(ctx, "All systems functioning properly", 330, 286, 21, M.dim);
    ctx.save(); ctx.strokeStyle = M.teal; ctx.lineWidth = 3; ctx.shadowColor = M.teal; ctx.shadowBlur = 10; ctx.beginPath();
    const beat = (u) => { u = ((u % 1) + 1) % 1; return u < 0.4 ? 0 : u < 0.45 ? -(u - 0.4) * 300 : u < 0.5 ? -15 + (u - 0.45) * 1500 : u < 0.55 ? 60 - (u - 0.5) * 1600 : u < 0.6 ? -20 + (u - 0.55) * 400 : 0; };
    for (let x = 0; x <= 260; x += 2) { const y = 225 - beat(x / 260 - t * 0.6) * 0.9; x ? ctx.lineTo(790 + x, y) : ctx.moveTo(790, y); }
    ctx.stroke(); ctx.restore();

    // power flow
    box(260, 322, 810, 300, "Power Flow");
    const mini = (x, label, l1, l2, l3) => { box(x, 368, 190, 236); txt(ctx, label, x + 95, 404, 19, M.dim, 600, "center"); txt(ctx, l1, x + 95, 520, 36, M.text, 700, "center"); txt(ctx, l2, x + 95, 554, 19, M.dim, 500, "center"); txt(ctx, l3, x + 95, 582, 19, M.dim, 500, "center"); };
    mini(290, "AC INPUT", "0 W", "120 V", "0 A");
    mini(850, "AC OUTPUT", outW + " W", "120 V", "0.5 A");
    ctx.strokeStyle = M.text; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(368, 440); ctx.lineTo(368, 462); ctx.moveTo(392, 440); ctx.lineTo(392, 462); ctx.stroke(); rr(ctx, 360, 462, 40, 22, 6); ctx.stroke();
    rr(ctx, 920, 434, 50, 54, 8); ctx.stroke(); ctx.fillStyle = M.text; ctx.fillRect(934, 448, 5, 12); ctx.fillRect(951, 448, 5, 12); ctx.beginPath(); ctx.arc(945, 474, 4, 0, Math.PI * 2); ctx.fill();
    box(520, 340, 290, 270); txt(ctx, "INVERTER / CHARGER", 665, 374, 18, M.dim, 600, "center");
    const g = ctx.createLinearGradient(545, 390, 545, 480); g.addColorStop(0, "#3b8ff0"); g.addColorStop(1, "#1d5bc4"); rr(ctx, 545, 388, 240, 92, 8); ctx.fillStyle = g; ctx.fill();
    txt(ctx, "victron energy", 665, 425, 16, "#dbe9ff", 600, "center"); txt(ctx, "MultiPlus-II", 665, 458, 22, "#ffffff", 700, "center");
    txt(ctx, invW + " W", 720, 524, 34, M.text, 700, "center"); txt(ctx, "48.0 V", 600, 556, 18, M.dim, 500, "center"); txt(ctx, "5.1 A", 735, 556, 18, M.dim, 500, "center");
    rr(ctx, 585, 568, 160, 32, 8); ctx.fillStyle = "#123a8a"; ctx.fill(); txt(ctx, "Bulk Charge", 665, 591, 18, M.text, 600, "center");
    flow(ctx, [[480, 486], [520, 486]], M.blue, t, 0.4);
    flow(ctx, [[810, 486], [850, 486]], M.blue, t, 0.8);

    // AC output receptacles
    box(260, 636, 810, 350, "AC Output Receptacles");
    ["GFCI 1", "GFCI 2", "AC 1", "AC 2", "AC 3", "AC 4"].forEach((name, i) => {
      const x = 280 + i * 130, [amp, w] = loads[i];
      box(x, 694, 118, 280); txt(ctx, name, x + 59, 724, 18, M.text, 600, "center");
      rr(ctx, x + 29, 738, 60, 66, 10); ctx.fillStyle = M.red; ctx.fill();
      ctx.fillStyle = "#3a0d0b"; ctx.fillRect(x + 44, 752, 6, 18); ctx.fillRect(x + 68, 752, 6, 18); ctx.beginPath(); ctx.arc(x + 59, 786, 6, Math.PI, 0); ctx.fill();
      ctx.fillStyle = M.green; ctx.beginPath(); ctx.arc(x + 40, 832, 7, 0, Math.PI * 2); ctx.fill(); txt(ctx, "ON", x + 54, 839, 19, M.green, 700);
      txt(ctx, "120 V", x + 59, 876, 19, M.dim, 500, "center"); txt(ctx, amp.toFixed(1) + " A", x + 59, 906, 19, M.dim, 500, "center");
      txt(ctx, w + " W", x + 59, 950, 22, M.text, 700, "center");
    });

    // battery status
    box(1086, 150, 500, 406, "Battery Status");
    ctx.save(); ctx.lineCap = "round"; ctx.lineWidth = 26; ctx.strokeStyle = "#16305c"; ctx.beginPath(); ctx.arc(1230, 360, 110, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = M.teal; ctx.shadowColor = M.teal; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(1230, 360, 110, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * soc / 100); ctx.stroke(); ctx.restore();
    txt(ctx, Math.round(soc) + "%", 1230, 372, 54, M.text, 700, "center"); txt(ctx, "State of Charge", 1230, 410, 18, M.dim, 500, "center");
    [[v.toFixed(1) + " V", "Voltage"], [a.toFixed(1) + " A", "Current"], [Math.round(v * a) + " W", "Power"], ["18h 20m", "Time Remaining"]].forEach(([val, lab], i) => {
      const y = 228 + i * 84; txt(ctx, val, 1400, y, 28, M.text, 700); txt(ctx, lab, 1400, y + 28, 17, M.dim);
      if (i < 3) { ctx.fillStyle = "#1a3a72"; ctx.fillRect(1400, y + 44, 160, 2); }
    });

    // system temperature
    box(1086, 568, 500, 176, "System Temperature");
    ctx.strokeStyle = M.text; ctx.lineWidth = 3; rr(ctx, 1130, 618, 18, 70, 9); ctx.stroke(); ctx.beginPath(); ctx.arc(1139, 700, 16, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = M.red; ctx.beginPath(); ctx.arc(1139, 700, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(1135, 640 + Math.sin(t) * 4, 8, 56);
    txt(ctx, "28 °C", 1300, 660, 28, M.text, 700, "center"); txt(ctx, "Internal", 1300, 692, 18, M.dim, 500, "center");
    txt(ctx, "32 °C", 1480, 660, 28, M.text, 700, "center"); txt(ctx, "Inverter", 1480, 692, 18, M.dim, 500, "center");

    // operating mode
    box(1086, 756, 500, 230, "Operating Mode");
    [["Normal", "UPS Mode"], ["Eco", "Low Power"], ["Standby", "Inverter Only"]].forEach(([h, s], i) => {
      const x = 1104 + i * 160;
      ctx.save(); rr(ctx, x, 812, 146, 158, 12); ctx.fillStyle = i === 0 ? "#1d4fc4" : "rgba(20,40,80,0.9)"; ctx.fill();
      if (i === 0) { ctx.shadowColor = M.glow; ctx.shadowBlur = 22; ctx.strokeStyle = "#6fa8ff"; ctx.lineWidth = 2; ctx.stroke(); } ctx.restore();
      ctx.strokeStyle = M.text; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + 73, 868, 24, 0, Math.PI * 2); ctx.stroke();
      txt(ctx, h, x + 73, 926, 22, M.text, 700, "center"); txt(ctx, s, x + 73, 952, 16, M.dim, 500, "center");
    });
  }

  const drawCore = draw;
  window.OasisUI = { W, H, logos, draw: (ctx, t, variant = "core") => (variant === "medical" ? drawMedical(ctx, t) : drawCore(ctx, t, variant)) };
})();

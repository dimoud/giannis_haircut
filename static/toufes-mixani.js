/* «Τούφες» — μηχανή προσομοίωσης και σχεδίασης, χωρίς DOM.
 * Τρέχει μέσα σε Worker (OffscreenCanvas) ώστε η κύλιση να μη βαραίνει ποτέ· αλλιώς στο κύριο νήμα.
 * Κάθε τούφα: αλυσίδα 12 σημείων Verlet (βαρύτητα, απόσβεση, περιορισμός μήκους, 3 επαναλήψεις).
 * Ο δείκτης είναι χτένα: σπρώχνει τα σημεία στην ακτίνα R και τα παρασύρει με την ταχύτητά του.
 * Χρώμα: balayage — η μετάβαση σκούρο → μελί ανεβαίνει από τις άκρες προς τη ρίζα με την κύλιση (p ∈ [0,1]). */
(function (G) {
  var ROOT = [38, 24, 16], MID = [74, 46, 31], DARKTIP = [104, 70, 46], HONEY = [222, 184, 128], COPPER = [196, 120, 80];
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgb(c, al) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + al + ')'; }
  function smooth(e0, e1, x) { var t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }

  G.ToufesMixani = function (ctx, opt) {
    var W = 0, H = 0, S = 12, strands = [], p = opt.mikro ? 0.55 : 0.12, pTarget = p, tint = opt.tint || null;
    var ptr = { x: -9999, y: -9999, vx: 0, vy: 0, on: false }, GR = 1, BANDS = 6, klimaka = 1, dpr = 1;
    var mikro = !!opt.mikro, MESH = !!opt.mesh;

    function build(w, h, d) {
      W = w; H = h; dpr = d; if (!W || !H) return;
      var mob = W < 735;
      GR = (!mikro && W >= 1069) ? 1.45 : 1;
      var K = mikro ? (mob ? 8 : 18) : (mob ? 13 : 52), ana = mob ? 5 : (mikro ? 7 : 8);
      var x0 = mob ? -0.04 : (mikro ? 0.42 : 0.4), x1 = 1.05;
      strands = [];
      for (var c = 0; c < K; c++) {
        var u = (c + Math.random() * 0.6) / K, cx = W * (x0 + (x1 - x0) * u), ph = Math.random() * 6.28;
        var Lc = H * (mikro ? 0.85 : (mob ? 0.95 : 1.12)) * ((mikro || mob ? 0.7 : 0.86) + Math.random() * 0.36), curl = (0.6 + Math.random() * 0.9) * (Math.random() < 0.5 ? -1 : 1);
        var tone = Math.random() < 0.5 ? 0 : 1, wd = mob ? 22 : (mikro ? 34 : 46);
        for (var i = 0; i < ana; i++) {
          var ax = cx + (Math.random() - 0.5) * wd, ay = -24 - Math.random() * 12;
          var L = Lc * (0.86 + Math.random() * 0.2), seg = L / S, pts = [];
          for (var j = 0; j <= S; j++) {
            var y = ay + (MESH ? j * seg : j * seg * 0.18), x = ax + (MESH ? 0 : Math.sin(j * 0.9 + ph) * 6);
            pts.push({ x: x, y: y, px: x, py: y });
          }
          strands.push({ pts: pts, seg: seg, ph: ph + (Math.random() - 0.5) * 0.5, curl: curl * (0.8 + Math.random() * 0.4), front: Math.random() < 0.6, tone: tone });
        }
      }
      resize(klimaka);
      if (MESH) { for (var k = 0; k < 260; k++) step(1 / 60, 0, true); draw(); }
    }
    // κλίμακα απόδοσης: ο καμβάς μικραίνει εσωτερικά αν η συσκευή δεν προλαβαίνει (οι τούφες μένουν ίδιες)
    function resize(k) {
      klimaka = k; var cv = ctx.canvas;
      cv.width = Math.max(1, Math.round(W * dpr * k)); cv.height = Math.max(1, Math.round(H * dpr * k));
      ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
    }

    function step(dt, time, quiet) {
      var g = 1500 * dt * dt, damp = 0.962, R = Math.max(70, W * 0.06), R2 = R * R;
      for (var s = 0; s < strands.length; s++) {
        var st = strands[s], pts = st.pts;
        var wind = quiet ? 0 : (Math.sin(time * 0.55 + st.ph) * 0.5 + Math.sin(time * 1.7 + st.ph * 2.3) * 0.22) * 26 * dt * dt;
        for (var j = 1; j <= S; j++) {
          var q = pts[j], vx = (q.x - q.px) * damp, vy = (q.y - q.py) * damp;
          q.px = q.x; q.py = q.y;
          q.x += vx + wind * (j / S) * 60 + Math.sin(j * 0.62 + st.ph) * st.curl * 260 * dt * dt * (j / S); q.y += vy + g;
          if (ptr.on) {
            var dx = q.x - ptr.x, dy = q.y - ptr.y, d2 = dx * dx + dy * dy;
            if (d2 < R2) {
              var d = Math.sqrt(d2) || 1, f = (R - d) / R;
              q.x += (dx / d) * (R - d) * 0.22 + ptr.vx * f * 0.35;
              q.y += (dy / d) * (R - d) * 0.06 + ptr.vy * f * 0.2;
            }
          }
        }
        for (var it = 0; it < 3; it++) {
          for (var k = 0; k < S; k++) {
            var a = pts[k], b = pts[k + 1], ddx = b.x - a.x, ddy = b.y - a.y;
            var dist = Math.sqrt(ddx * ddx + ddy * ddy) || 0.0001, diff = (dist - st.seg) / dist;
            if (k === 0) { b.x -= ddx * diff; b.y -= ddy * diff; }
            else { var h = 0.5 * diff; a.x += ddx * h; a.y += ddy * h; b.x -= ddx * h; b.y -= ddy * h; }
          }
        }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      var edge = 1 - 0.78 * p, tip = tint ? mix(tint, HONEY, 0.55) : HONEY;
      for (var layer = 0; layer < 4; layer++) {
        var front = layer >= 2, tn = layer % 2;
        for (var b = 0; b < BANDS; b++) {
          var tb = (b + 0.5) / BANDS;
          var dark = tb < 0.3 ? mix(ROOT, MID, tb / 0.3) : mix(MID, DARKTIP, (tb - 0.3) / 0.7);
          var c = mix(dark, tip, smooth(edge - 0.18, edge + 0.22, tb));
          if (tn) c = mix(c, [c[0] * 1.18, c[1] * 1.08, c[2] * 0.95], 0.7);
          if (tint && b < 2) c = mix(c, tint, 0.25);
          ctx.strokeStyle = rgb(c, front ? 0.95 : 0.55);
          ctx.lineWidth = (front ? 2.6 : 1.5) * GR * (1.15 - tb * 0.75);
          ctx.beginPath();
          var j0 = Math.floor(b * S / BANDS), j1 = Math.ceil((b + 1) * S / BANDS);
          for (var s = 0; s < strands.length; s++) {
            var st = strands[s]; if (st.front !== front || st.tone !== tn) continue;
            var pts = st.pts;
            ctx.moveTo(pts[j0].x, pts[j0].y);
            for (var j = j0 + 1; j <= j1 && j <= S; j++) {
              var m = pts[j - 1], n = pts[j];
              ctx.quadraticCurveTo(m.x, m.y, (m.x + n.x) / 2, (m.y + n.y) / 2);
            }
            ctx.lineTo(pts[Math.min(j1, S)].x, pts[Math.min(j1, S)].y);
          }
          ctx.stroke();
        }
      }
      if (W < 735) return;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgb(mix(COPPER, HONEY, p), 0.12);
      ctx.lineWidth = 3; ctx.beginPath();
      for (var s2 = 0; s2 < strands.length; s2 += 2) {
        var q = strands[s2].pts; if (!strands[s2].front) continue;
        ctx.moveTo(q[2].x, q[2].y); ctx.lineTo(q[3].x, q[3].y); ctx.lineTo(q[4].x, q[4].y);
      }
      ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
    }

    // ένα καρέ· επιστρέφει τον χρόνο σχεδίασης (ms) για την προσαρμογή ποιότητας
    var mesos = 0, plithos = 0;
    function frame(dt, time) {
      var t0 = (G.performance || Date).now();
      p += (pTarget - p) * Math.min(1, dt * 4);
      step(dt, time, false); draw();
      ptr.vx *= 0.8; ptr.vy *= 0.8;
      var ms = (G.performance || Date).now() - t0;
      mesos = mesos * 0.92 + ms * 0.08; plithos++;
      // αν δεν προλαβαίνει (μέσος όρος > 9 ms), μικραίνει η εσωτερική ανάλυση· ποτέ κάτω από 0,5
      if (plithos > 40 && mesos > 9 && klimaka > 0.55) { resize(Math.round((klimaka - 0.15) * 100) / 100); plithos = 0; mesos = 0; }
      return ms;
    }
    return {
      build: build, frame: frame, draw: draw,
      setP: function (v, amesa) { pTarget = v; if (amesa) { p = v; draw(); } },
      pointer: function (x, y, on) { if (on && ptr.on) { ptr.vx = x - ptr.x; ptr.vy = y - ptr.y; } ptr.x = on ? x : -9999; ptr.y = on ? y : -9999; ptr.on = on; }
    };
  };
})(typeof self !== 'undefined' ? self : this);

/* «Τούφες» — μηχανή προσομοίωσης και σχεδίασης, χωρίς DOM.
 * Τρέχει μέσα σε Worker (OffscreenCanvas) ώστε η κύλιση να μη βαραίνει ποτέ· αλλιώς στο κύριο νήμα.
 * Κάθε τούφα: αλυσίδα 12 σημείων Verlet (βαρύτητα, απόσβεση, περιορισμός μήκους, 3 επαναλήψεις).
 * Ο δείκτης είναι χτένα: σπρώχνει τα σημεία στην ακτίνα R και τα παρασύρει με την ταχύτητά του.
 * Σχεδίαση: WebGL όπου υπάρχει κάρτα γραφικών (κάθε τρίχα μια λεπτή κορδέλα τριγώνων, ένα μόνο draw call ανά καρέ)·
 *   αλλιώς καμβάς 2D με λιγότερες τρίχες και χαμηλότερη ανάλυση.
 * Χρώμα: balayage — η μετάβαση σκούρο → μελί ανεβαίνει από τις άκρες προς τη ρίζα με την κύλιση (p ∈ [0,1]). */
(function (G) {
  var ROOT = [46, 29, 19], MID = [66, 40, 26], DARKTIP = [98, 64, 40], HONEY = [222, 184, 128], COPPER = [196, 120, 80];
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgb(c, al) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + al + ')'; }
  function smooth(e0, e1, x) { var t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }

  // Περιβάλλον σχεδίασης: WebGL με πραγματική κάρτα γραφικών, αλλιώς 2D.
  G.ToufesCtx = function (cv, dokimi) {
    var c = null;
    try { c = cv.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true, depth: false, stencil: false, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: !dokimi }); } catch (e) { c = null; }
    return c || cv.getContext('2d');
  };
  var VS = 'attribute vec2 a;attribute vec3 b;uniform vec2 r;varying vec3 v;varying float y;void main(){v=b;y=a.y;gl_Position=vec4(a.x/r.x*2.-1.,1.-a.y/r.y*2.,0.,1.);}';
  var FS = 'precision mediump float;uniform sampler2D g;uniform float lg;varying vec3 v;varying float y;void main(){float c=clamp(v.y+.5-abs(v.x),0.,1.);vec4 k=texture2D(g,vec2(clamp((y+30.)/(lg+30.),0.,1.),v.z));gl_FragColor=vec4(k.rgb*k.a,k.a)*c;}';

  G.ToufesMixani = function (ctx, opt) {
    var gl = ctx && ctx.drawElements ? ctx : null, glr = null;
    var W = 0, H = 0, S = 12, strands = [], p = opt.mikro ? 0.55 : 0.12, pTarget = p, tint = opt.tint || null;
    var ptr = { x: -9999, y: -9999, vx: 0, vy: 0, on: false }, GR = 1, klimaka = 1, dpr = 1;
    var mikro = !!opt.mikro, MESH = !!opt.mesh;

    function build(w, h, d) {
      W = w; H = h; dpr = gl ? d : Math.min(d, 1); if (!W || !H) return;
      if (!gl && klimaka > 0.8) klimaka = 0.8;   // χωρίς κάρτα γραφικών: χαμηλότερη εσωτερική ανάλυση
      var mob = W < 735;
      GR = (!mikro && W >= 1069) ? 1.45 : 1;
      var K = mikro ? (mob ? 8 : 18) : (mob ? 22 : (gl ? 64 : 32)), ana = mob ? 6 : (mikro || !gl ? 7 : 10);
      var x0 = mob ? -0.04 : (mikro ? 0.42 : 0.4), x1 = 1.05;
      strands = [];
      for (var c = 0; c < K; c++) {
        var u = (c + Math.random() * 0.6) / K, cx = W * (x0 + (x1 - x0) * u), ph = Math.random() * 6.28;
        var Lc = H * (mikro ? 0.85 : (mob ? 0.95 : 1.12)) * ((mikro || mob ? 0.7 : 0.86) + Math.random() * 0.36), curl = (mob ? 0.3 : 1) * (0.25 + Math.random() * 0.3) * (Math.random() < 0.5 ? -1 : 1);
        var tone = Math.random() < 0.5 ? 0 : 1, wd = mob ? 20 : (mikro ? 30 : 34);
        for (var i = 0; i < ana; i++) {
          var ax = cx + (Math.random() - 0.5) * wd, ay = -24 - Math.random() * 12;
          var L = Lc * (0.86 + Math.random() * 0.2), seg = L / S, pts = [];
          for (var j = 0; j <= S; j++) {
            var y = ay + j * seg, x = ax;   // ξεκινούν ήδη κρεμασμένες: καμία αναμονή μέχρι να «πέσουν»
            pts.push({ x: x, y: y, px: x, py: y });
          }
          strands.push({ pts: pts, seg: seg, ph: ph + (Math.random() - 0.5) * 0.25, curl: curl * (0.9 + Math.random() * 0.2), front: Math.random() < 0.6, tone: tone });
        }
      }
      strands.sort(function (a, b) { return (a.front * 2 + a.tone) - (b.front * 2 + b.tone); });   // πίσω → μπροστά
      resize(klimaka);
      if (gl) glBuild();
      for (var k = 0; k < (MESH ? 260 : 90); k++) step(1 / 60, 0, true);   // ισορροπία πριν από το πρώτο καρέ
      draw();
    }
    // κλίμακα απόδοσης: ο καμβάς μικραίνει εσωτερικά αν η συσκευή δεν προλαβαίνει (οι τούφες μένουν ίδιες)
    function resize(k) {
      klimaka = k; var cv = ctx.canvas;
      cv.width = Math.max(1, Math.round(W * dpr * k)); cv.height = Math.max(1, Math.round(H * dpr * k));
      if (gl) gl.viewport(0, 0, cv.width, cv.height); else ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
    }

    function step(dt, time, quiet) {
      var g = 1500 * dt * dt, damp = 0.962, R = Math.max(70, W * 0.06), R2 = R * R;
      for (var s = 0; s < strands.length; s++) {
        var st = strands[s], pts = st.pts;
        var wind = quiet ? 0 : (Math.sin(time * 0.45 + st.ph * 0.5) * 0.5 + Math.sin(time * 1.1 + st.ph) * 0.12) * (W < 735 ? 4 : 14) * dt * dt;
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

    // Χρώμα σε ύψος tb ∈ [0,1]: ρίζα → μήκος → άκρη (balayage με την κύλιση) και μία ζώνη γυαλάδας, όπως πέφτει το φως σε ίσια μαλλιά.
    function xroma(tb, front, tn) {
      var edge = 1 - 0.78 * p, tip = tint ? mix(tint, HONEY, 0.55) : HONEY;
      var dark = tb < 0.3 ? mix(ROOT, MID, tb / 0.3) : mix(MID, DARKTIP, (tb - 0.3) / 0.7);
      var c = mix(dark, tip, smooth(edge - 0.18, edge + 0.22, tb));
      if (tn) c = mix(c, [c[0] * 1.18, c[1] * 1.08, c[2] * 0.95], 0.7);
      if (tint && tb < 0.3) c = mix(c, tint, 0.25 * (1 - tb / 0.3));
      if (front) { var gy = (tb - 0.3) / 0.11; c = mix(c, [240, 210, 158], 0.38 * Math.exp(-gy * gy)); }
      return c;
    }

    // ---- WebGL ----
    var P = 2 * S + 1, TW = 64, verts = null, tex = null, sm = new Float32Array(P * 2), nIdx = 0;
    function glInit() {
      function sh(t, src) { var o = gl.createShader(t); gl.shaderSource(o, src); gl.compileShader(o); return o; }
      var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error('toufes gl');
      gl.useProgram(pr);
      glr = { a: gl.getAttribLocation(pr, 'a'), b: gl.getAttribLocation(pr, 'b'), r: gl.getUniformLocation(pr, 'r'), lg: gl.getUniformLocation(pr, 'lg'), vb: gl.createBuffer(), ib: gl.createBuffer(), tx: gl.createTexture() };
      gl.bindTexture(gl.TEXTURE_2D, glr.tx);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.disable(gl.DEPTH_TEST); gl.clearColor(0, 0, 0, 0);
      tex = new Uint8Array(TW * 4 * 4);
    }
    function glBuild() {
      if (!glr) glInit();
      var n = strands.length, idx = new Uint16Array(n * (P - 1) * 6), q = 0;
      verts = new Float32Array(n * P * 2 * 5);
      for (var s = 0; s < n; s++) {
        var base = s * P * 2;
        for (var i = 0; i < P - 1; i++) { var v0 = base + i * 2; idx[q++] = v0; idx[q++] = v0 + 1; idx[q++] = v0 + 2; idx[q++] = v0 + 1; idx[q++] = v0 + 3; idx[q++] = v0 + 2; }
      }
      nIdx = q;
      gl.bindBuffer(gl.ARRAY_BUFFER, glr.vb); gl.bufferData(gl.ARRAY_BUFFER, verts.byteLength, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(glr.a); gl.vertexAttribPointer(glr.a, 2, gl.FLOAT, false, 20, 0);
      gl.enableVertexAttribArray(glr.b); gl.vertexAttribPointer(glr.b, 3, gl.FLOAT, false, 20, 8);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glr.ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    }
    function glDraw() {
      var sc = dpr * klimaka, o = 0, n = strands.length;
      // διαβάθμιση χρώματος: 4 σειρές (πίσω/μπροστά × δύο τόνοι), μία υφή 64×4
      for (var l = 0; l < 4; l++) for (var i = 0; i < TW; i++) {
        var c = xroma(i / (TW - 1), l >= 2, l % 2), t = (l * TW + i) * 4;
        tex[t] = c[0] > 255 ? 255 : c[0]; tex[t + 1] = c[1] > 255 ? 255 : c[1]; tex[t + 2] = c[2] > 255 ? 255 : c[2]; tex[t + 3] = l >= 2 ? 242 : 140;
      }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TW, 4, 0, gl.RGBA, gl.UNSIGNED_BYTE, tex);
      for (var s = 0; s < n; s++) {
        var st = strands[s], pts = st.pts, row = ((st.front ? 2 : 0) + st.tone + 0.5) / 4, wb = (st.front ? 1.9 : 1.2) * GR * 0.5 * sc;
        // εξομάλυνση: ένα ενδιάμεσο σημείο Catmull-Rom ανά τμήμα
        for (var j = 0; j <= S; j++) {
          var a = pts[j]; sm[j * 4] = a.x; sm[j * 4 + 1] = a.y;
          if (j < S) {
            var b = pts[j + 1], z = pts[j ? j - 1 : 0], d = pts[j + 2 <= S ? j + 2 : S];
            sm[j * 4 + 2] = (9 * (a.x + b.x) - z.x - d.x) / 16; sm[j * 4 + 3] = (9 * (a.y + b.y) - z.y - d.y) / 16;
          }
        }
        for (var k = 0; k < P; k++) {
          var k0 = k ? k - 1 : 0, k1 = k < P - 1 ? k + 1 : k;
          var tx = sm[k1 * 2] - sm[k0 * 2], ty = sm[k1 * 2 + 1] - sm[k0 * 2 + 1], len = Math.sqrt(tx * tx + ty * ty) || 1;
          var hw = wb * (1.05 - 0.52 * k / (P - 1)), e = hw + 1, ex = -ty / len * e / sc, ey = tx / len * e / sc, x = sm[k * 2], y = sm[k * 2 + 1];
          verts[o++] = x + ex; verts[o++] = y + ey; verts[o++] = e; verts[o++] = hw; verts[o++] = row;
          verts[o++] = x - ex; verts[o++] = y - ey; verts[o++] = -e; verts[o++] = hw; verts[o++] = row;
        }
      }
      gl.uniform2f(glr.r, W, H); gl.uniform1f(glr.lg, H * 1.12);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, verts);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, nIdx, gl.UNSIGNED_SHORT, 0);
    }

    function draw() {
      if (gl) { glDraw(); return; }
      ctx.clearRect(0, 0, W, H);
      // 2D: το χρώμα ακολουθεί το ύψος με συνεχή διαβάθμιση· τρία πάχη ανά στρώση, η τρίχα λεπταίνει προς την άκρη
      var LG = H * 1.12, N = 12;
      for (var layer = 0; layer < 4; layer++) {
        var front = layer >= 2, tn = layer % 2, gr = ctx.createLinearGradient(0, -30, 0, LG);
        for (var b = 0; b <= N; b++) {
          var tb = b / N, c = xroma(tb, front, tn);
          gr.addColorStop(tb, rgb(c, front ? 0.95 : 0.55));
        }
        ctx.strokeStyle = gr;
        for (var w3 = 0; w3 < 3; w3++) {
          var j0 = Math.floor(w3 * S / 3), j1 = Math.min(S, Math.ceil((w3 + 1) * S / 3));
          ctx.lineWidth = (front ? 1.9 : 1.2) * GR * (1.05 - w3 * 0.24);
          ctx.beginPath();
          for (var s = 0; s < strands.length; s++) {
            var st = strands[s]; if (st.front !== front || st.tone !== tn) continue;
            var pts = st.pts;
            ctx.moveTo(pts[j0].x, pts[j0].y);
            for (var j = j0 + 1; j <= j1; j++) {
              var m = pts[j - 1], n = pts[j];
              ctx.quadraticCurveTo(m.x, m.y, (m.x + n.x) / 2, (m.y + n.y) / 2);
            }
            ctx.lineTo(pts[j1].x, pts[j1].y);
          }
          ctx.stroke();
        }
      }
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
      if (!gl && plithos > 40 && mesos > 9 && klimaka > 0.55) { resize(Math.round((klimaka - 0.15) * 100) / 100); plithos = 0; mesos = 0; }
      return ms;
    }
    return {
      build: build, frame: frame, draw: draw,
      setP: function (v, amesa) { pTarget = v; if (amesa) { p = v; draw(); } },
      pointer: function (x, y, on) { if (on && ptr.on) { ptr.vx = x - ptr.x; ptr.vy = y - ptr.y; } ptr.x = on ? x : -9999; ptr.y = on ? y : -9999; ptr.on = on; }
    };
  };
})(typeof self !== 'undefined' ? self : this);

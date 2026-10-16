// Footer sky: real satellites around the Earth, propagated in the browser
// with SGP4 (satellite.js) from TLEs fetched at build time from CelesTrak.
// Each page highlights one satellite, chosen from its URL, and shows where
// that satellite is right now.
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var RE = 6371; // Earth radius, km
  var AZIMUTH = -0.6; // camera rotation around the Earth's axis, rad
  var ELEVATION = 0.32; // camera height above the equatorial plane, rad

  function hash(text) {
    var h = 2166136261;
    for (var i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    return h >>> 0;
  }

  function el(name, attrs) {
    var node = document.createElementNS(NS, name);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }

  function draw(svg, sats) {
    var box = svg.getBoundingClientRect();
    var W = box.width;
    var H = box.height;
    if (!W || !H) return;

    var css = getComputedStyle(document.documentElement);
    var text = css.getPropertyValue("--text").trim() || "#d9d5cc";
    var accent = css.getPropertyValue("--accent").trim() || "#f0a63a";
    var bg = css.getPropertyValue("--bg").trim() || "#0e0e0c";

    var cx = W * (W < 520 ? 0.62 : 0.7);
    var cy = H * 0.42;
    var k = H * 0.115; // Earth radius on screen, px

    // Altitude is drawn on a square-root scale so low orbits (400 km) and
    // geostationary ones (36 000 km) fit in the same strip; then the point
    // is rotated into the camera frame. D > 0 is the near side of the Earth.
    function project(v) {
      var r = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
      var f = (k * (1 + Math.sqrt(Math.max(r - RE, 0) / RE))) / r;
      var x = v.x * f;
      var y = v.y * f;
      var z = v.z * f;
      var x1 = x * Math.cos(AZIMUTH) - y * Math.sin(AZIMUTH);
      var y1 = x * Math.sin(AZIMUTH) + y * Math.cos(AZIMUTH);
      return {
        X: cx + x1,
        Y: cy - (z * Math.cos(ELEVATION) - y1 * Math.sin(ELEVATION)),
        D: y1 * Math.cos(ELEVATION) + z * Math.sin(ELEVATION)
      };
    }

    function hidden(p) {
      return p.D < 0 && Math.hypot(p.X - cx, p.Y - cy) < k * 1.02;
    }

    var seed = svg.getAttribute("data-seed") || "/";
    var lit = seed === "/" ? 0 : hash(seed) % sats.length;

    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.textContent = "";
    var behind = el("g", {});
    var front = el("g", {});
    svg.appendChild(behind);

    // One full revolution of each orbit from now, split into the parts
    // hidden behind the Earth and the parts in front of it.
    var now = Date.now();
    sats.forEach(function (sat, n) {
      var period = (2 * Math.PI) / sat.rec.no; // minutes
      var back = "";
      var fore = "";
      var prev = null;
      for (var s = 0; s <= 200; s++) {
        var pv = satellite.propagate(sat.rec, new Date(now + (s / 200) * period * 60000));
        if (!pv.position) continue;
        var p = project(pv.position);
        if (prev) {
          var seg = "M" + prev.X.toFixed(1) + " " + prev.Y.toFixed(1) + "L" + p.X.toFixed(1) + " " + p.Y.toFixed(1);
          if (hidden(p)) back += seg;
          else fore += seg;
        }
        prev = p;
      }
      var style = {
        fill: "none",
        stroke: n === lit ? accent : text,
        "stroke-opacity": n === lit ? 0.6 : 0.13,
        "stroke-width": 1
      };
      behind.appendChild(el("path", Object.assign({ d: back }, style)));
      front.appendChild(el("path", Object.assign({ d: fore }, style)));
    });

    // The Earth, with a few parallels on its visible face.
    svg.appendChild(el("circle", { cx: cx, cy: cy, r: k, fill: bg, stroke: text, "stroke-opacity": 0.35 }));
    for (var lat = -60; lat <= 60; lat += 30) {
      var d = "";
      for (var lon = 0; lon <= 360; lon += 6) {
        var a = (lon * Math.PI) / 180;
        var b = (lat * Math.PI) / 180;
        var q = project({ x: RE * Math.cos(b) * Math.cos(a), y: RE * Math.cos(b) * Math.sin(a), z: RE * Math.sin(b) });
        if (q.D >= 0) d += (d ? "L" : "M") + q.X.toFixed(1) + " " + q.Y.toFixed(1);
      }
      if (d) svg.appendChild(el("path", { d: d, fill: "none", stroke: text, "stroke-opacity": 0.08 }));
    }
    svg.appendChild(front);

    var body = el("circle", { r: 2.8, fill: accent });
    svg.appendChild(body);
    var label = document.querySelector(".orbit-elements");
    var sat = sats[lit];

    function tick() {
      var date = new Date();
      var pv = satellite.propagate(sat.rec, date);
      if (!pv.position) return;
      var p = project(pv.position);
      body.setAttribute("cx", p.X.toFixed(2));
      body.setAttribute("cy", p.Y.toFixed(2));
      body.setAttribute("opacity", hidden(p) ? 0.25 : 1);
      if (!label) return;
      var geo = satellite.eciToGeodetic(pv.position, satellite.gstime(date));
      var v = pv.velocity;
      var lat = satellite.degreesLat(geo.latitude);
      var lon = satellite.degreesLong(geo.longitude);
      label.textContent =
        sat.name.toLowerCase() +
        " · " + Math.round(geo.height).toLocaleString("en") + " km" +
        " · " + Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z).toFixed(2) + " km/s" +
        " · " + Math.abs(lat).toFixed(1) + "°" + (lat < 0 ? "S" : "N") +
        " " + Math.abs(lon).toFixed(1) + "°" + (lon < 0 ? "W" : "E");
    }

    // Update once per second, only while the footer is on screen.
    tick();
    if (svg._observer) svg._observer.disconnect();
    clearInterval(svg._timer);
    svg._observer = new IntersectionObserver(function (entries) {
      clearInterval(svg._timer);
      if (entries[0].isIntersecting) svg._timer = setInterval(tick, 1000);
    });
    svg._observer.observe(svg);
  }

  function init() {
    var data = document.getElementById("tle-data");
    if (!data || !window.satellite) return;
    var sats = JSON.parse(data.textContent || "[]").map(function (s) {
      return { name: s.name, rec: satellite.twoline2satrec(s.line1, s.line2) };
    });
    if (!sats.length) return;
    var svgs = document.querySelectorAll("svg.orbits");
    for (var i = 0; i < svgs.length; i++) draw(svgs[i], sats);
  }

  document.addEventListener("DOMContentLoaded", init);

  // Redraw only when the width changes; mobile toolbars change the height.
  var resizeTimer;
  var lastWidth = window.innerWidth;
  window.addEventListener("resize", function () {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(init, 200);
  });
})();

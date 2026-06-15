/* ============================================================
   Orange in the Blue — Map ⇄ Animals gallery
   Drives both Photography and Video pages from a JSON data file.
   To move to the real CMS later, only loadItems() changes — the
   rendering below stays identical. (Swap fetch(src) for the CMS API.)
   ============================================================ */
(function () {
  var app = document.getElementById('gallery-app');
  if (!app) return;
  var SRC  = app.getAttribute('data-src');
  var KIND = app.getAttribute('data-kind') || 'photo'; // 'photo' | 'film'
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var elMap     = document.getElementById('map');
  var elMapView = document.getElementById('map-view');
  var elAniView = document.getElementById('animal-view');
  var elGroups  = document.getElementById('animal-groups');
  var btnMap    = document.getElementById('btn-map');
  var btnAni    = document.getElementById('btn-animals');
  var lb        = document.getElementById('lightbox');

  var map = null, mapBuilt = false, ITEMS = [];

  function swatch(i) { return 'sw' + (i % 6); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' })[c]; }); }
  function sideLabel(s) { return s === 'above' ? 'Above the surface' : 'Beneath the surface'; }

  /* ---- DATA (the only CMS-coupled bit) ---- */
  function loadItems() {
    return fetch(SRC, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  /* ---- MAP ---- */
  function buildMap() {
    if (mapBuilt || typeof L === 'undefined') return;
    map = L.map('map', { scrollWheelZoom: false, worldCopyJump: true, minZoom: 2 });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd', maxZoom: 19
    }).addTo(map);

    var pts = [];
    ITEMS.forEach(function (it, i) {
      if (typeof it.lat !== 'number' || typeof it.lng !== 'number') return;
      var icon = L.divIcon({ className: '', html: '<div class="pin"><span></span></div>', iconSize: [16,16], iconAnchor: [8,8] });
      var m = L.marker([it.lat, it.lng], { icon: icon, title: it.title });
      m.bindPopup(popupHTML(it, i), { closeButton: true, maxWidth: 260 });
      m.addTo(map);
      pts.push([it.lat, it.lng]);
    });
    if (pts.length) map.fitBounds(pts, { padding: [50, 50] });
    else map.setView([10, 0], 2);
    mapBuilt = true;
  }

  function popupHTML(it, i) {
    var thumb = KIND === 'film'
      ? '<div class="pop-thumb ' + swatch(i) + '"><div class="pop-play"></div></div>'
      : '<div class="pop-thumb ' + swatch(i) + '"></div>';
    return '' +
      thumb +
      '<div class="pop-body">' +
        '<div class="pop-animal">' + esc(it.animal) + '</div>' +
        '<div class="pop-title">' + esc(it.title) + '</div>' +
        '<div class="pop-place">' + esc(it.place) + '</div>' +
        '<span class="pop-tag">' + esc(sideLabel(it.side)) + (it.duration ? ' · ' + esc(it.duration) : '') + '</span>' +
      '</div>';
  }

  /* ---- ANIMALS ---- */
  function buildAnimals() {
    var groups = {};
    ITEMS.forEach(function (it) {
      var k = it.animal || 'Other';
      (groups[k] = groups[k] || []).push(it);
    });
    var names = Object.keys(groups).sort();
    var html = '';
    var idx = 0;
    names.forEach(function (name) {
      var list = groups[name];
      html += '<div class="animal-group"><h2>' + esc(name) + ' <span class="count">' + list.length + (list.length === 1 ? (KIND === 'film' ? ' film' : ' shot') : (KIND === 'film' ? ' films' : ' shots')) + '</span></h2><div class="card-grid">';
      list.forEach(function (it) {
        var k = idx++;
        var media = KIND === 'film'
          ? '<div class="thumb ' + swatch(k) + '"><div class="play-badge"></div>' + (it.duration ? '<span class="dur">' + esc(it.duration) + '</span>' : '') + '</div>'
          : '<div class="thumb ' + swatch(k) + '"></div>';
        html += '<article class="card" data-i="' + ITEMS.indexOf(it) + '">' +
          '<span class="side">' + esc(sideLabel(it.side)) + '</span>' +
          media +
          '<div class="meta"><div class="t">' + esc(it.title) + '</div><div class="p">' + esc(it.place) + '</div></div>' +
        '</article>';
      });
      html += '</div></div>';
    });
    elGroups.innerHTML = html;
    elGroups.querySelectorAll('.card').forEach(function (c) {
      c.addEventListener('click', function () { openLightbox(ITEMS[+c.getAttribute('data-i')], +c.getAttribute('data-i')); });
    });
  }

  /* ---- LIGHTBOX ---- */
  function openLightbox(it, i) {
    if (!lb) return;
    var thumb = KIND === 'film'
      ? '<div class="lb-thumb ' + swatch(i) + '"><div class="pop-play"></div></div>'
      : '<div class="lb-thumb ' + swatch(i) + '"></div>';
    lb.querySelector('.lb-card').innerHTML =
      '<button class="lb-close" aria-label="Close">✕</button>' + thumb +
      '<div class="lb-body">' +
        '<div class="lb-animal">' + esc(it.animal) + (it.duration ? ' · ' + esc(it.duration) : '') + '</div>' +
        '<div class="lb-title">' + esc(it.title) + '</div>' +
        '<div class="lb-place">' + esc(it.place) + ' · ' + esc(sideLabel(it.side)) + '</div>' +
        (it.caption ? '<p class="lb-cap">' + esc(it.caption) + '</p>' : '') +
      '</div>';
    lb.classList.add('open');
    lb.querySelector('.lb-close').addEventListener('click', closeLightbox);
  }
  function closeLightbox() { if (lb) lb.classList.remove('open'); }
  if (lb) lb.addEventListener('click', function (e) { if (e.target === lb) closeLightbox(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLightbox(); });

  /* ---- VIEW TOGGLE ---- */
  function showMap() {
    elMapView.classList.add('active'); elAniView.classList.remove('active');
    btnMap.setAttribute('aria-pressed', 'true'); btnAni.setAttribute('aria-pressed', 'false');
    buildMap();
    if (map) setTimeout(function () { map.invalidateSize(); }, 60); // container was hidden
  }
  function showAnimals() {
    elAniView.classList.add('active'); elMapView.classList.remove('active');
    btnAni.setAttribute('aria-pressed', 'true'); btnMap.setAttribute('aria-pressed', 'false');
  }
  if (btnMap) btnMap.addEventListener('click', showMap);
  if (btnAni) btnAni.addEventListener('click', showAnimals);

  /* ---- BOOT ---- */
  loadItems().then(function (items) {
    ITEMS = Array.isArray(items) ? items : [];
    buildAnimals();
    showMap(); // map is the default, headline view
  }).catch(function (err) {
    elGroups.innerHTML = '<p class="lead">Couldn\'t load the collection (' + esc(err.message) + '). The data file may still be syncing — try again in a moment.</p>';
    showAnimals();
  });
})();

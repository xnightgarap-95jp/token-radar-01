// Token Launch Radar — board rendering, filters, sorting and detail view.
// All data comes from window.RADAR, written by main.ts from the sealed snapshot.
// The page makes no network request: it only reads that one local data file.

(function () {
  'use strict';
  var data = window.RADAR;
  if (!data) {
    document.getElementById('rows').innerHTML =
      '<tr><td colspan="9">No radar data loaded.</td></tr>';
    return;
  }
  var rows = data.rows.slice();
  var params = new URLSearchParams(window.location.search);
  var selected = null;

  /** $1,234,567,890 or $12.3M / $1.2B for the wide columns. */
  function money(n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return '$' + n;
  }
  function moneyFull(n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  }
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Header stats and snapshot line.
  var watchCount = rows.filter(function (r) { return r.on_watchlist; }).length;
  document.getElementById('stats').innerHTML =
    '<div class="stat"><b>' + rows.length + '</b><span>candidates ranked</span></div>' +
    '<div class="stat"><b>' + watchCount + '</b><span>on the watchlist</span></div>' +
    '<div class="stat"><b>' + data.protocols_scanned + '</b><span>protocols scanned</span></div>' +
    '<div class="stat"><b>' + money(rows[0].implied_value_usd) + '</b><span>top implied value</span></div>';
  document.getElementById('asof').textContent = data.as_of;

  // Category filter options, biggest categories first.
  var catCount = {};
  rows.forEach(function (r) {
    var c = r.category || 'Uncategorised';
    catCount[c] = (catCount[c] || 0) + 1;
  });
  var cats = Object.keys(catCount).sort(function (a, b) { return catCount[b] - catCount[a]; });
  var catSel = document.getElementById('category');
  cats.forEach(function (c) {
    var opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c + ' (' + catCount[c] + ')';
    catSel.appendChild(opt);
  });

  /** The rows after search, filter, category and sort are applied. */
  function visibleRows() {
    var q = document.getElementById('q').value.trim().toLowerCase();
    var filter = document.getElementById('filter').value;
    var cat = catSel.value;
    var out = rows.filter(function (r) {
      if (q && r.name.toLowerCase().indexOf(q) === -1 && r.slug.indexOf(q) === -1) return false;
      if (filter === 'watchlist' && !r.on_watchlist) return false;
      if (filter === 'below' && r.on_watchlist) return false;
      if (filter === 'top' && r.rank > 25) return false;
      if (cat && (r.category || 'Uncategorised') !== cat) return false;
      return true;
    });
    var sort = document.getElementById('sort').value;
    var key = { value: 'implied_value_usd', tvl: 'tvl_usd', growth: 'change_7d', age: 'age_days' }[sort];
    out.sort(function (a, b) {
      var av = a[key] === null || a[key] === undefined ? -Infinity : a[key];
      var bv = b[key] === null || b[key] === undefined ? -Infinity : b[key];
      return bv - av;
    });
    return out;
  }

  /** The detail panel for one protocol, with its model workings and farm plan. */
  function showDetail(row) {
    selected = row;
    var el = document.getElementById('detail');
    var change = row.change_7d === null ? 'not reported' : (row.change_7d > 0 ? '+' : '') + row.change_7d.toFixed(2) + '%';
    var steps = row.farm_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    el.innerHTML =
      '<button class="close" id="close-detail">Close ✕</button>' +
      '<h2>' + esc(row.name) + '</h2>' +
      '<p class="sub">' + esc(row.slug) + ' · ' + esc(row.category || 'Uncategorised') + ' · ' +
      esc(row.chains.join(', ')) + ' · tracked since ' + (row.listed_at || 'unknown') + '</p>' +
      '<div class="grid">' +
      '<div class="cell"><b>' + moneyFull(row.implied_value_usd) + '</b><span>implied value · rank #' + row.rank + '</span></div>' +
      '<div class="cell"><b>' + money(row.tvl_usd) + '</b><span>TVL</span></div>' +
      '<div class="cell"><b>' + change + '</b><span>TVL change, 7 days</span></div>' +
      '<div class="cell"><b>' + row.age_days + ' days</b><span>tracked with no token recorded</span></div>' +
      '<div class="cell"><b>' + (row.on_watchlist ? 'Yes — watchlist' : 'No — below the floor') + '</b><span>watchlist status</span></div>' +
      '</div>' +
      '<p class="formula">Why it ranks here: ' + money(row.tvl_usd) + ' TVL × ' + row.multiple +
      ' (' + esc(row.category || 'uncategorised') + ' multiple) × ' + row.growth_factor +
      ' (growth) × ' + row.age_factor + ' (age) = ' + moneyFull(row.implied_value_usd) + '.</p>' +
      '<h3>How to farm it</h3><ol>' + steps + '</ol>' +
      '<p class="formula">This protocol records no token in the snapshot — that is DefiLlama\u2019s record, ' +
      'not proof it has none. Farm with a fresh wallet and only what you can afford to lose.</p>';
    el.hidden = false;
    document.getElementById('close-detail').addEventListener('click', function () {
      el.hidden = true;
      selected = null;
      render();
    });
    el.scrollIntoView({ behavior: 'instant', block: 'start' });
  }

  /** Render the table from the current controls. */
  function render() {
    var list = visibleRows();
    document.getElementById('count').textContent = list.length + ' of ' + rows.length + ' shown';
    var html = list.map(function (r) {
      var change = r.change_7d === null
        ? '<span>—</span>'
        : '<span class="' + (r.change_7d >= 0 ? 'up' : 'down') + '">' + (r.change_7d > 0 ? '+' : '') + r.change_7d.toFixed(1) + '%</span>';
      var badge = r.on_watchlist
        ? '<span class="badge">WATCHLIST</span>'
        : '<span class="badge below">BELOW FLOOR</span>';
      return '<tr data-slug="' + esc(r.slug) + '"' + (selected && selected.slug === r.slug ? ' class="selected"' : '') + '>' +
        '<td class="num">' + r.rank + '</td>' +
        '<td><span class="name">' + esc(r.name) + '</span>' + badge + '<br><span class="slug">' + esc(r.slug) + '</span></td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td>' + esc(r.chains.slice(0, 2).join(', ')) + (r.chains.length > 2 ? ' +' + (r.chains.length - 2) : '') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + change + '</td>' +
        '<td class="num">' + r.age_days + 'd</td>' +
        '<td class="num value">' + money(r.implied_value_usd) + '</td>' +
        '<td><button type="button" data-detail="' + esc(r.slug) + '">Farm plan →</button></td>' +
        '</tr>';
    }).join('');
    document.getElementById('rows').innerHTML = html || '<tr><td colspan="9">No protocols match.</td></tr>';
  }

  document.getElementById('rows').addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-detail]');
    var tr = ev.target.closest('tr[data-slug]');
    var slug = btn ? btn.getAttribute('data-detail') : tr ? tr.getAttribute('data-slug') : null;
    if (!slug) return;
    var row = rows.find(function (r) { return r.slug === slug; });
    if (row) showDetail(row);
  });
  ['q', 'filter', 'category', 'sort'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', render);
    document.getElementById(id).addEventListener('change', render);
  });

  // Protocols whose token already trades: listed apart, never ranked.
  document.getElementById('live').innerHTML = data.live_top.map(function (p) {
    return '<li><strong>' + esc(p.name) + '</strong> (' + esc(p.symbol || '—') + ') — ' + money(p.mcap_usd) + ' market cap</li>';
  }).join('') + '<li>…and ' + (data.live_count - data.live_top.length) + ' more with a token recorded.</li>';

  // Deep links for the screenshots: ?detail=<slug>, ?filter=watchlist, ?q=<text>.
  // A detail link opens the protocol's own view: the board and model blocks
  // hide so the detail panel sits at the top of the page, fully in frame.
  if (params.get('q')) document.getElementById('q').value = params.get('q');
  if (params.get('filter')) document.getElementById('filter').value = params.get('filter');
  if (params.get('category')) catSel.value = params.get('category');
  render();
  var detailSlug = params.get('detail');
  if (detailSlug) {
    var row = rows.find(function (r) { return r.slug === detailSlug; });
    if (row) {
      document.body.classList.add('detail-mode');
      showDetail(row);
      window.scrollTo(0, 0);
    }
  }
})();

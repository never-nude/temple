/* Original measured diagrams generated from temple-evidence.json.
   These are new geometric drawings, not reproductions of reference plates. */
function createTempleDrawings(host, evidence, onSelect) {
  if (!host || !evidence) throw new Error('A drawing host and temple evidence are required.');
  const NS = 'http://www.w3.org/2000/svg';
  const uid = 'temple-drawing-' + Math.random().toString(36).slice(2);
  const bindings = [];
  const ink = '#343b3c', muted = '#66716e', gold = '#eee2bb', wall = '#d8dcda';
  let disposed = false;
  const ew = evidence.eastWestSequence;
  const ns = evidence.northSouthSequenceAtSecondCellStorey;
  const height = evidence.heightStackAbovePriestlyCourt;
  const byPart = (list, name) => list.find(v => v.part === name);
  const E = (tag, attrs = {}, text) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const add = (p, tag, attrs, text) => { const n = E(tag, attrs, text); p.appendChild(n); return n; };
  const line = (p, x1, y1, x2, y2, attrs = {}) => add(p, 'line', { x1, y1, x2, y2, stroke: ink, 'stroke-width': 1.5, ...attrs });
  const rect = (p, x, y, width, h, attrs = {}) => add(p, 'rect', { x, y, width, height: h, stroke: ink, 'stroke-width': 1.4, fill: 'white', ...attrs });
  const label = (p, x, y, value, attrs = {}) => add(p, 'text', { x, y, fill: ink, 'font-size': 18, 'font-weight': 500, 'text-anchor': 'middle', ...attrs }, value);
  const title = (p, text) => add(p, 'title', {}, text);
  function interactive(parent, id, name, tooltip) {
    const g = add(parent, 'g', { 'data-select': id, role: 'button', tabindex: 0, 'aria-label': name, class: 'measured-room' });
    title(g, tooltip || name);
    const activate = e => {
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      if (typeof onSelect === 'function') onSelect(id);
    };
    g.addEventListener('click', activate);
    g.addEventListener('keydown', activate);
    bindings.push([g, activate]);
    return g;
  }
  function dimH(p, x1, x2, y, fromY, value) {
    const g = add(p, 'g', { class: 'drawing-dimension' });
    line(g, x1, fromY, x1, y + 7, { stroke: muted, 'stroke-width': 1 });
    line(g, x2, fromY, x2, y + 7, { stroke: muted, 'stroke-width': 1 });
    line(g, x1, y, x2, y, { stroke: muted, 'marker-start': `url(#${uid}-arrow)`, 'marker-end': `url(#${uid}-arrow)` });
    const w = Math.max(48, value.length * 10);
    rect(g, (x1 + x2 - w) / 2, y - 13, w, 25, { fill: 'white', stroke: 'none' });
    label(g, (x1 + x2) / 2, y + 6, value, { fill: muted, 'font-size': 18 });
  }
  function dimV(p, x, y1, y2, fromX, value) {
    const g = add(p, 'g', { class: 'drawing-dimension' });
    line(g, fromX, y1, x + 7, y1, { stroke: muted, 'stroke-width': 1 });
    line(g, fromX, y2, x + 7, y2, { stroke: muted, 'stroke-width': 1 });
    line(g, x, y1, x, y2, { stroke: muted, 'marker-start': `url(#${uid}-arrow)`, 'marker-end': `url(#${uid}-arrow)` });
    const middle = (y1 + y2) / 2;
    rect(g, x - 13, middle - Math.max(25, value.length * 5), 26, Math.max(50, value.length * 10), { fill: 'white', stroke: 'none' });
    label(g, x + 6, middle, value, { fill: muted, 'font-size': 18, transform: `rotate(-90 ${x + 6} ${middle})` });
  }
  function callout(p, points, x, y, text, attrs = {}) {
    add(p, 'polyline', { points, fill: 'none', stroke: muted, 'stroke-width': 1 });
    label(p, x, y, text, { fill: muted, 'font-size': 16, 'text-anchor': 'start', ...attrs });
  }
  function base(kind, heading, description) {
    const svg = E('svg', { viewBox: '0 0 720 650', 'data-kind': kind, role: 'img', 'aria-label': description, 'aria-labelledby': `${uid}-title`, 'aria-describedby': `${uid}-desc`, xmlns: NS });
    svg.style.cssText = 'display:block;width:100%;height:auto;max-height:100%;margin:auto;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#fff;color:#343b3c;';
    title(svg, heading).id = `${uid}-title`;
    add(svg, 'desc', { id: `${uid}-desc` }, description);
    const defs = add(svg, 'defs', {});
    const marker = add(defs, 'marker', { id: `${uid}-arrow`, viewBox: '0 0 8 8', refX: 4, refY: 4, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse', markerUnits: 'strokeWidth' });
    add(marker, 'path', { d: 'M 7 1 L 1 4 L 7 7', fill: 'none', stroke: muted, 'stroke-width': 1.2 });
    const hatch = add(defs, 'pattern', { id: `${uid}-hatch`, width: 7, height: 7, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    line(hatch, 0, 0, 0, 7, { stroke: '#b1bab6', 'stroke-width': 1 });
    add(svg, 'style', {}, '.measured-room{cursor:pointer;outline:none}.measured-room:hover>rect:first-of-type,.measured-room:focus>rect:first-of-type{stroke:#7b5c20;stroke-width:3}.measured-room:focus{outline:none}.drawing-dimension{pointer-events:none}');
    rect(svg, 0, 0, 720, 650, { stroke: 'none', fill: '#fff' });
    label(svg, 34, 34, heading, { 'font-size': 23, 'font-weight': 650, 'text-anchor': 'start' });
    label(svg, 34, 58, kind === 'plan' ? 'Second cell storey · north is up · east is right' : 'East–west section · looking south', { 'font-size': 16, fill: muted, 'text-anchor': 'start' });
    return svg;
  }
  function footer(svg, extra) {
    label(svg, 360, 614, extra, { 'font-size': 16, fill: muted });
    label(svg, 360, 640, 'Middot dimensions · 0.5 m model cubit · scholarly reconstruction', { 'font-size': 15, fill: muted });
  }
  function plan() {
    const svg = base('plan', 'Measured plan', 'Interactive measured plan of the Temple building: a 50 metre east–west footprint, a 50 metre wide porch, 35 metre lower body, Holy Place, Holy of Holies, cells, northern passage and southern drain.');
    const s = 9, west = ew.at(-1).xWest, east = ew[0].xEast;
    const X = x => 130 + (x - west) * s;
    const Z = z => 97 + (z + evidence.overall.porchWidthNorthSouthMetres / 2) * s;
    const R = (p, x0, x1, z0, z1, attrs = {}) => rect(p, X(x0), Z(z0), (x1 - x0) * s, (z1 - z0) * s, attrs);
    const porch = byPart(ew, 'porch interior');
    const holy = byPart(ew, 'Holy Place interior');
    const holies = byPart(ew, 'Holy of Holies interior');
    const halfBody = evidence.overall.lowerBodyWidthNorthSouthMetres / 2;
    const halfPorch = evidence.overall.porchWidthNorthSouthMetres / 2;
    const porchBack = porch.xWest;
    const footprint = `M ${X(west)} ${Z(-halfBody)} H ${X(porchBack)} V ${Z(-halfPorch)} H ${X(east)} V ${Z(halfPorch)} H ${X(porchBack)} V ${Z(halfBody)} H ${X(west)} Z`;
    add(svg, 'path', { d: footprint, fill: wall, stroke: ink, 'stroke-width': 2 });
    add(svg, 'path', { d: footprint, fill: `url(#${uid}-hatch)`, stroke: 'none', 'pointer-events': 'none' });
    const holyGroup = interactive(svg, 'sanctuary', 'Holy Place, 20 by 10 metres', 'Holy Place: 40 × 20 cubits; 20 × 10 m at the model cubit. Middot 4:7.');
    R(holyGroup, holy.xWest, holy.xEast, -5, 5, { fill: gold });
    label(holyGroup, X((holy.xWest + holy.xEast) / 2), Z(-.8), 'Holy Place', { 'font-size': 19, 'font-weight': 600 });
    label(holyGroup, X((holy.xWest + holy.xEast) / 2), Z(1.7), '20 × 10 m', { 'font-size': 17, fill: muted });
    const inner = interactive(svg, 'holies', 'Holy of Holies, 10 by 10 metres', 'Holy of Holies: 20 × 20 cubits; 10 × 10 m. Empty of furnishings; no Ark is shown.');
    R(inner, holies.xWest, holies.xEast, -5, 5, { fill: '#e6d3a0' });
    label(inner, X((holies.xWest + holies.xEast) / 2), Z(-1.5), 'Holy of', { 'font-size': 17, 'font-weight': 600 });
    label(inner, X((holies.xWest + holies.xEast) / 2), Z(.7), 'Holies', { 'font-size': 17, 'font-weight': 600 });
    label(inner, X((holies.xWest + holies.xEast) / 2), Z(3), '10 × 10 m', { 'font-size': 15, fill: muted });
    const ulam = interactive(svg, 'ulam', 'Porch, 5.5 metres deep', 'Ulam: 11 cubits / 5.5 m deep. Its outer opening is 10 m wide; inner opening 5 m wide.');
    R(ulam, porch.xWest, porch.xEast, -22.5, 22.5, { fill: '#f7f2e2' });
    label(ulam, X((porch.xWest + porch.xEast) / 2), Z(0), 'Porch · 5.5 m deep', { 'font-size': 18, transform: `rotate(-90 ${X((porch.xWest + porch.xEast) / 2)} ${Z(0)})` });
    // Axis apertures through thick walls, with the four inner door leaves.
    const outerWall = byPart(ew, 'porch exterior wall');
    const innerWall = byPart(ew, 'heikhal entrance wall');
    R(svg, outerWall.xWest, outerWall.xEast + .02, -5, 5, { fill: '#fff', stroke: 'none' });
    R(svg, innerWall.xWest - .02, innerWall.xEast + .02, -2.5, 2.5, { fill: '#fff', stroke: 'none' });
    for (const x of [innerWall.xEast - .2, innerWall.xWest + .2]) for (const sign of [-1, 1]) {
      line(svg, X(x), Z(sign * 2.5), X(x + (x > -33 ? -1.9 : -1.4)), Z(sign * .6), { stroke: '#9d7c34', 'stroke-width': 2 });
    }
    // The two curtains are separated by one model cubit; openings alternate.
    const gap = byPart(ew, 'curtain interval');
    line(svg, X(gap.xEast), Z(-5), X(gap.xEast), Z(4.2), { stroke: '#826276', 'stroke-width': 2.3 });
    line(svg, X(gap.xWest), Z(-4.2), X(gap.xWest), Z(5), { stroke: '#826276', 'stroke-width': 2.3 });
    callout(svg, `${X(gap.xWest)},${Z(5.2)} ${X(gap.xWest)},${Z(7)} ${X(gap.xWest) + 12},${Z(7)}`, X(gap.xWest) + 16, Z(7.5), 'Double curtain · 0.5 m', { 'font-size': 15 });
    const cells = interactive(svg, 'cells', 'Surrounding cells: 38 across three storeys', 'This plan shows the middle storey: five cells north, five south, three west. The complete building has 38 cells: 15 + 15 + 8. Bay lengths and partition details are interpreted.');
    const cellWest = byPart(ew, 'western cell');
    const cellRunWest = holies.xWest, cellRunEast = holy.xEast;
    for (const side of ['north', 'south']) {
      const band = byPart(ns, `${side} cell`), count = evidence.cells[side + 'ByStorey'][1];
      const span = (cellRunEast - cellRunWest) / count;
      for (let i = 0; i < count; i++) {
        const g = R(cells, cellRunWest + span * i + .08, cellRunWest + span * (i + 1) - .08, band.zNorth, band.zSouth, { fill: '#f6f7f5', 'data-cell': `${side}-${i + 1}` });
        title(g, `${side} cell ${i + 1}; middle-storey width ${band.metres} m. Bay divisions are interpretive.`);
      }
    }
    for (let i = 0; i < evidence.cells.westByStorey[1]; i++) R(cells, cellWest.xWest, cellWest.xEast, -11 + i * 22 / 3 + .08, -11 + (i + 1) * 22 / 3 - .08, { fill: '#f6f7f5', 'data-cell': `west-${i + 1}` });
    const northStair = byPart(ns, 'north mesibbah');
    const stairs = interactive(svg, 'stairs', 'Northern stepped passage, 1.5 metres wide', 'Mesibbah: 3 cubits / 1.5 m wide. It ascends west from the northeast, then turns south and east toward the upper chamber. Stair arrangement is reconstructed.');
    R(stairs, cellWest.xEast, porch.xWest, northStair.zNorth, northStair.zSouth, { fill: '#dce7e0' });
    for (let x = cellWest.xEast + .5; x < porch.xWest; x += evidence.porchSteps.riserMetres * 2) line(stairs, X(x), Z(northStair.zNorth), X(x), Z(northStair.zSouth), { stroke: '#a4b7ac', 'stroke-width': .8 });
    line(stairs, X(-38), Z(-14.25), X(-65), Z(-14.25), { stroke: '#49675b', 'stroke-width': 1.6, 'marker-end': `url(#${uid}-arrow)` });
    callout(svg, `${X(-51)},${Z(-14.25)} ${X(-51)},${Z(-15.5)}`, X(-51), Z(-16.1), 'Northern passage', { 'text-anchor': 'middle', 'font-size': 16 });
    const drain = byPart(ns, 'south water descent');
    R(svg, cellWest.xEast, porch.xWest, drain.zNorth, drain.zSouth, { fill: '#e8f0f0', stroke: '#7e9899' });
    callout(svg, `${X(-50)},${Z(14.25)} ${X(-50)},${Z(20)}`, X(-50), Z(22), 'Water descent · 1.5 m', { 'text-anchor': 'middle', 'font-size': 16 });
    // Step treads are shown outside the building; the temple dimensions exclude them.
    const stepGroup = interactive(svg, 'ulam', 'Twelve steps rise three metres to the porch', 'Twelve steps, each 0.25 m high with 0.5 m tread. Middot 3:6 also describes landings.');
    for (let i = 0; i < evidence.porchSteps.count; i++) line(stepGroup, X(east + i * evidence.porchSteps.treadMetres), Z(-6), X(east + i * evidence.porchSteps.treadMetres), Z(6), { stroke: '#88918c', 'stroke-width': 1 });
    callout(svg, `${X(-21)},${Z(6.2)} ${X(-20.5)},${Z(11)} ${X(-18)},${Z(11)}`, X(-18), Z(12.7), '12 steps', { 'text-anchor': 'middle', 'font-size': 16 });
    dimH(svg, X(west), X(east), 580, Z(halfPorch), '50 m');
    dimV(svg, 646, Z(-halfPorch), Z(halfPorch), X(east), '50 m');
    dimV(svg, 82, Z(-halfBody), Z(halfBody), X(west), '35 m');
    dimH(svg, X(holy.xWest), X(holy.xEast), 142, Z(-halfBody), '20 m');
    dimH(svg, X(holies.xWest), X(holies.xEast), 142, Z(-halfBody), '10 m');
    label(svg, 680, 98, 'N', { 'font-size': 19 });
    line(svg, 680, 137, 680, 109, { 'stroke-width': 2, 'marker-end': `url(#${uid}-arrow)` });
    footer(svg, '38 cells in three storeys · bay lengths and stair arrangement interpreted');
    return svg;
  }
  function section() {
    const svg = base('section', 'Measured section', 'Interactive east–west Temple section, showing a three metre foundation, twenty metre sacred chamber, twenty metre upper chamber, roof layers, western cells, porch and entrance steps.');
    const s = 8.6, west = ew.at(-1).xWest, east = ew[0].xEast;
    const X = x => 134 + (x - west) * s;
    const Y = h => 527 - h * s;
    const R = (p, x0, x1, h0, h1, attrs = {}) => rect(p, X(x0), Y(h1), (x1 - x0) * s, (h1 - h0) * s, attrs);
    const foundation = byPart(height, 'foundation');
    const sacred = byPart(height, 'sacred chamber');
    const upper = byPart(height, 'upper chamber');
    const parapet = byPart(height, 'parapet');
    const spikes = byPart(height, 'bird spikes');
    const holy = byPart(ew, 'Holy Place interior');
    const holies = byPart(ew, 'Holy of Holies interior');
    const porch = byPart(ew, 'porch interior');
    const westWall = byPart(ew, 'western sacred wall');
    const cell = byPart(ew, 'western cell');
    const bodyTop = upper.topAbovePriestlyCourt;
    // The section cut is on the central axis: west cells are visible, north cells are off-plane.
    R(svg, west, east, 0, foundation.metres, { fill: wall });
    R(svg, westWall.xWest, byPart(ew, 'heikhal entrance wall').xEast, foundation.metres, bodyTop, { fill: wall });
    R(svg, westWall.xWest, byPart(ew, 'heikhal entrance wall').xEast, foundation.metres, bodyTop, { fill: `url(#${uid}-hatch)`, stroke: 'none' });
    const sacredGroup = interactive(svg, 'sanctuary', 'Holy Place, 20 metres high', 'The Holy Place is 40 cubits / 20 m high above the temple floor, with a 20 × 10 m plan.');
    R(sacredGroup, holy.xWest, holy.xEast, sacred.baseAbovePriestlyCourt, sacred.topAbovePriestlyCourt, { fill: gold });
    label(sacredGroup, X((holy.xEast + holy.xWest) / 2), Y(14), 'Holy Place', { 'font-size': 19, 'font-weight': 600 });
    const holiesGroup = interactive(svg, 'holies', 'Holy of Holies, 20 metres high', 'The Holy of Holies occupies the western 20 cubits / 10 m of the sacred interior. No Ark is shown.');
    R(holiesGroup, holies.xWest, holies.xEast, sacred.baseAbovePriestlyCourt, sacred.topAbovePriestlyCourt, { fill: '#e6d3a0' });
    label(holiesGroup, X((holies.xEast + holies.xWest) / 2), Y(15), 'Holy of', { 'font-size': 17, 'font-weight': 600 });
    label(holiesGroup, X((holies.xEast + holies.xWest) / 2), Y(12.5), 'Holies', { 'font-size': 17, 'font-weight': 600 });
    const gap = byPart(ew, 'curtain interval');
    for (const x of [gap.xWest, gap.xEast]) line(svg, X(x), Y(sacred.baseAbovePriestlyCourt), X(x), Y(sacred.topAbovePriestlyCourt), { stroke: '#826276', 'stroke-width': 2 });
    const upperGroup = interactive(svg, 'upper', 'Upper chamber, 20 metres high', 'Upper chamber: 40 cubits / 20 m clear height. Its position above both sacred rooms, southern access and maintenance hatches follow Middot 4:5–6.');
    R(upperGroup, holies.xWest, holy.xEast, upper.baseAbovePriestlyCourt, upper.topAbovePriestlyCourt, { fill: '#f4f2e9' });
    label(upperGroup, X((holies.xWest + holy.xEast) / 2) - 10, Y(36.5), 'Upper chamber', { 'font-size': 20, 'font-weight': 600 });
    label(upperGroup, X((holies.xWest + holy.xEast) / 2) - 10, Y(33.5), '20 m clear height', { 'font-size': 17, fill: muted });
    // A cedar ladder at the southern doorway is represented in projection.
    const ladderX = X(holy.xEast - 2.2), ladderBottom = Y(upper.baseAbovePriestlyCourt), ladderTop = Y(upper.topAbovePriestlyCourt);
    line(upperGroup, ladderX, ladderBottom, ladderX - 64, ladderTop, { stroke: '#87734e', 'stroke-width': 3 });
    line(upperGroup, ladderX + 6, ladderBottom, ladderX - 58, ladderTop, { stroke: '#87734e', 'stroke-width': 3 });
    for (let i = 1; i < 18; i++) line(upperGroup, ladderX - 64 * i / 18, ladderBottom + (ladderTop - ladderBottom) * i / 18, ladderX + 6 - 64 * i / 18, ladderBottom + (ladderTop - ladderBottom) * i / 18, { stroke: '#87734e', 'stroke-width': 1.4 });
    // Distinct structural layers retain their measured thicknesses.
    for (const layer of height.filter(v => /ceiling/.test(v.part))) {
      R(svg, westWall.xWest, byPart(ew, 'heikhal entrance wall').xEast, layer.baseAbovePriestlyCourt, layer.topAbovePriestlyCourt, { fill: /beams/.test(layer.part) ? '#a69068' : /coffers/.test(layer.part) ? '#ddd5bf' : wall, 'stroke-width': .8 });
    }
    const cells = interactive(svg, 'cells', 'Western cells in three storeys', 'West cells: three at each lower storey and two at the top. This central cut intersects one cell per storey. Heights of 6 m and intermediate floors of 1 m are interpreted.');
    R(cells, west, cell.xEast, foundation.metres, upper.baseAbovePriestlyCourt, { fill: wall });
    for (let tier = 0; tier < 3; tier++) {
      const bottom = foundation.metres + tier * (evidence.cells.clearHeightMetresByStorey[tier] + evidence.cells.intermediateCeilingThicknessMetres);
      const clear = evidence.cells.clearHeightMetresByStorey[tier];
      // The western sacred wall steps back a model cubit at each higher cell storey.
      R(cells, cell.xWest, cell.xEast + (tier - 1) * evidence.basis.cubitMetres, bottom, bottom + clear, { fill: '#f6f7f5' });
    }
    callout(svg, `${X(cell.xWest + .7)},${Y(14)} 104,${Y(14)} 104,430`, 100, 450, 'Cells', { 'text-anchor': 'end', 'font-size': 16 });
    const ulam = interactive(svg, 'ulam', 'Porch and its two entrances', 'Porch: 5.5 m deep. Outer opening 20 m high; inner entrance 10 m high. The full-height porch is supported by cedar wall ties.');
    R(ulam, porch.xWest, porch.xEast, foundation.metres, parapet.baseAbovePriestlyCourt, { fill: '#f7f2e2' });
    const outer = byPart(ew, 'porch exterior wall');
    R(ulam, outer.xWest, outer.xEast, foundation.metres + evidence.openings.outerPorch.heightMetres, parapet.baseAbovePriestlyCourt, { fill: wall });
    // Inner wall above the 10 m doorway, and several cedar ties across the high porch.
    const innerWall = byPart(ew, 'heikhal entrance wall');
    R(ulam, innerWall.xWest, innerWall.xEast, foundation.metres + evidence.openings.innerHeikhal.heightMetres, upper.topAbovePriestlyCourt, { fill: wall });
    for (const y of [28, 35, 42]) line(ulam, X(porch.xWest), Y(y), X(porch.xEast), Y(y), { stroke: '#99835e', 'stroke-width': 3 });
    for (let i = 0; i < evidence.porchLintels.beamCount; i++) R(ulam, outer.xWest, outer.xEast, foundation.metres + evidence.openings.outerPorch.heightMetres + i, foundation.metres + evidence.openings.outerPorch.heightMetres + i + .5, { fill: '#a48b60', 'stroke-width': .5 });
    label(ulam, X((porch.xWest + porch.xEast) / 2), Y(15), 'Porch', { 'font-size': 18, transform: `rotate(-90 ${X((porch.xWest + porch.xEast) / 2)} ${Y(15)})` });
    // Roof is flat, with measured parapet and schematic bird-deterrent spikes.
    R(svg, westWall.xWest, east, 45.5, parapet.baseAbovePriestlyCourt, { fill: wall, 'stroke-width': 1.1 });
    for (const [a, b] of [[westWall.xWest, westWall.xWest + .55], [east - .55, east]]) R(svg, a, b, parapet.baseAbovePriestlyCourt, parapet.topAbovePriestlyCourt, { fill: wall });
    line(svg, X(westWall.xWest), Y(parapet.topAbovePriestlyCourt), X(east), Y(parapet.topAbovePriestlyCourt), { stroke: muted, 'stroke-width': 1 });
    for (let x = westWall.xWest + .3; x < east; x += .8) line(svg, X(x), Y(parapet.topAbovePriestlyCourt), X(x), Y(spikes.topAbovePriestlyCourt), { stroke: '#9d7c34', 'stroke-width': 1.3 });
    // The forward stair profile: twelve 0.25 m rises with 0.5 m treads.
    const stair = interactive(svg, 'ulam', 'Porch steps, three metres total rise', 'Twelve steps rise from the priestly court to the 3 m temple foundation. Landing layout is schematic.');
    let d = `M ${X(east)} ${Y(foundation.metres)}`;
    for (let i = 1; i <= evidence.porchSteps.count; i++) d += ` H ${X(east + i * evidence.porchSteps.treadMetres)} V ${Y(foundation.metres - i * evidence.porchSteps.riserMetres)}`;
    add(stair, 'path', { d, fill: 'none', stroke: ink, 'stroke-width': 1.6 });
    line(svg, X(west - 1.5), Y(0), X(east + 7), Y(0), { stroke: ink, 'stroke-width': 2 });
    dimV(svg, 83, Y(50), Y(0), X(west), '50 m');
    dimV(svg, 464, Y(sacred.topAbovePriestlyCourt), Y(sacred.baseAbovePriestlyCourt), X(holy.xEast), '20 m');
    dimV(svg, 464, Y(upper.topAbovePriestlyCourt), Y(upper.baseAbovePriestlyCourt), X(holy.xEast), '20 m');
    dimH(svg, X(west), X(east), 570, Y(0), '50 m');
    callout(svg, `${X(-47)},${Y(24.3)} ${X(-47)},${Y(25)} 595,${Y(25)}`, 597, Y(25) + 5, 'Ceiling 2.5 m', { 'font-size': 15 });
    callout(svg, `${X(-49)},${Y(1.5)} ${X(-49)},549 256,549`, 253, 554, 'Foundation 3 m', { 'text-anchor': 'end', 'font-size': 16 });
    footer(svg, 'Cell heights, roof details and cedar ladder arrangement are reconstructed');
    return svg;
  }
  function clearBindings() {
    for (const [node, fn] of bindings.splice(0)) {
      node.removeEventListener('click', fn);
      node.removeEventListener('keydown', fn);
    }
  }
  return {
    show(kind) {
      if (disposed) return;
      clearBindings();
      const svg = kind === 'section' ? section() : plan();
      host.replaceChildren(svg);
      host.hidden = false;
      host.dataset.drawing = kind === 'section' ? 'section' : 'plan';
    },
    hide() { if (!disposed) host.hidden = true; },
    dispose() {
      if (disposed) return;
      clearBindings();
      host.replaceChildren();
      delete host.dataset.drawing;
      host.hidden = true;
      disposed = true;
    }
  };
}

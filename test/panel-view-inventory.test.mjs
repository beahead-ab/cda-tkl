import test from 'node:test';
import assert from 'node:assert/strict';
import { stationIds } from '../src/station.mjs';
import { formatInventory, panelViewInventory, readStationFiles } from '../scripts/panel-view-inventory.mjs';

// En liten syntetisk station: en huvudsignal vid en rak väg österut, en dvärgsignal, en stopplykta och en korsningsväxel.
const flow = (x1, x2, block) => ({ id: 'T' + x1, x1, y1: 100, x2, y2: 100, block });
function station({ deg = 90, slipName2 = 'Vx2', bindSlip = true } = {}) {
  const panel = { micons: [{ mast: 'A1', type: 'hsi_5', x: 91, y: 70, deg, scale: 1 }, { mast: 'A2', type: 'dvsi_4', x: 191, y: 70, deg: 90, scale: 1 },
    { mast: 'S1', type: 'ssi_2', x: 391, y: 70, deg: 90, scale: 1 }],
  turnouts: { t1: { name: 'Vx1', type: 'RH_TURNOUT' } }, slips: { s1: { name: 'Vx3', name2: slipName2, type: 'DOUBLE_SLIP' } } };
  const route = (id, signals, end, guard) => ({ id, from: 'b' + id, to: 'e' + id, kind: 'main', signals, guardSignals: guard,
    source: { nxButtons: ['tvsA1', end] }, boundaries: signals.map((mast, i) => ({ mast, index: i, sensor: 'tvs' + mast })),
    flow: [flow(80, 200, 'B1'), flow(200, 300, 'B2'), flow(300, 400, 'B3')] });
  const profile = { signals: { A1: { address: 1 }, A2: { address: 2 }, S1: { address: 3 } },
    turnouts: { Vx1: { address: 10 }, Vx3: { address: 11 }, ...(bindSlip ? { Vx2: { address: 12 } } : {}) },
    routes: [route('mot-dvarg', ['A1'], 'tvsA2', ['A2']), route('utfart', ['A1', 'A2'], 'tvsA2', []), route('mot-lykta', ['A1'], 'tvsS1', ['S1'])] };
  const endpoints = { endpoints: ['A1', 'A2', 'S1'].map(mast => ({ sensor: 'tvs' + mast, mast })) };
  const registry = { signals: [{ id: 'A1', type: 'hsi_5', aspects: ['Stop', 'Clear 80'] }, { id: 'A2', type: 'dvsi_4', aspects: ['Sh0', 'Sh1 Stop', 'Sh2'] },
    { id: 'S1', type: 'ssi_2', aspects: ['Lit', 'Unlit'] }] };
  return { panel, profile, endpoints, registry };
}

test('inventeringen klassar symboler, slutpunkter och delbesked som 85-vyn gör', () => {
  const inv = panelViewInventory(station());
  assert.deepEqual(inv.signals.byKind, { main: ['A1'], dwarf: ['A2'], combined: [], lamp: ['S1'], other: [] });
  assert.deepEqual(inv.signals.partial.map(x => x.mast), ['A2'], 'tvålägesrapporten kan inte skilja dvärgens besked');
  assert.equal(inv.endpoints.shown, 1);
  assert.deepEqual(inv.endpoints.exits, ['utfart'], 'en utfart slutar vid sin egen signal i kör');
  assert.deepEqual(inv.endpoints.lamps, ['mot-lykta'], 'stopplyktan har ingen 85-symbol att färga');
  assert.deepEqual(inv.endpoints.missing, []);
  assert.equal(inv.mainStart.mapped, 3);
});

test('en signal som pekar mot färdriktningen och en ofullständigt bunden korsningsväxel redovisas', () => {
  const ok = panelViewInventory(station());
  assert.deepEqual(ok.direction.wrong, []);
  assert.equal(ok.direction.signals, 2);assert.deepEqual(ok.direction.unchecked, ['S1']);
  const turned = panelViewInventory(station({ deg: 270 }));
  assert.deepEqual(turned.direction.wrong.map(x => x.route), ['mot-dvarg', 'mot-lykta', 'utfart']);
  const slip = panelViewInventory(station({ bindSlip: false }));
  assert.deepEqual(slip.turnouts.slips, [{ type: 'DOUBLE_SLIP', names: ['Vx3', 'Vx2'], unbound: ['Vx2'] }]);
  assert.deepEqual(slip.turnouts.unbound, ['Vx2']);
  assert.deepEqual(panelViewInventory(station({ slipName2: null })).turnouts.singleBranchSlips, ['Vx3']);
  assert.match(formatInventory('Prov', turned), /3 pekar mot färdriktningen/);
});

test('paketets stationer: varje signal har symbol och rätt riktning, och varje korsningsväxel två bundna delar', () => {
  const ids = stationIds();
  assert.ok(ids.length > 0);
  for (const id of ids) {
    const files = readStationFiles(id), inv = panelViewInventory(files), title = files.station.title;
    assert.deepEqual(inv.signals.other, [], title + ': en ny signaltyp behöver en 85-symbol eller ett uttryckligt undantag');
    assert.deepEqual(inv.signals.noRotation, [], title);
    assert.deepEqual(inv.signals.unbound, [], title);
    assert.deepEqual(inv.direction.wrong, [], title + ': signalbilden pekar mot färdriktningen');
    assert.deepEqual(inv.direction.far, [], title + ': signalbilden sitter långt från sin tågväg');
    assert.ok(inv.direction.signals > 0, title);
    assert.deepEqual(inv.endpoints.missing, [], title + ': slutpunkt utan entydig mast');
    for (const slip of inv.turnouts.slips) {
      assert.equal(slip.names.length, 2, title + ': ' + slip.names[0] + ' ritas som enkelväxel');
      assert.deepEqual(slip.unbound, [], title + ': ' + slip.names.join('/'));
    }
    assert.match(formatInventory(title, inv), new RegExp('^' + title + ': \\d+ signaler'));
  }
});

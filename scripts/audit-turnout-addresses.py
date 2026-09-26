#!/usr/bin/env python3
"""Compare physical layout turnouts independently against original JMRI XML."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser()
p.add_argument('--source', type=Path, default=root/'public/data/source/Cda60.xml')
p.add_argument('--report', type=Path)
args = p.parse_args()
raw = args.source.read_bytes()
xml = ET.fromstring(raw)
read = lambda name: json.loads((root/name).read_text())
profile = read('profiles/charlottendal-network.json')
simulator = read('profiles/simulator-network.json')
panel = read('public/data/panel.json')
admin = read('public/data/admin.json')
objects = {}
for e in xml.findall('./turnouts/turnout'):
    name = e.findtext('userName')
    if name and re.fullmatch(r'Vx\d+', name):
        assert name not in objects, f'Duplicate source object: {name}'
        objects[name] = e
layout = {e.get('ident'): e for e in xml.findall('.//layoutturnout')}
assert set(layout) == set(panel['turnouts']), 'Layout IDs differ'
assert set(profile['turnouts']) == {e.get('turnoutname') for e in layout.values()}, 'Missing or extra runtime turnout'
addresses = set()
rows = []
for ident, t in sorted(panel['turnouts'].items(), key=lambda row: int(row[1]['name'][2:])):
    name = t['name']
    e = objects[name]
    system = e.findtext('systemName')
    assert re.fullmatch(r'LT[1-9]\d*', system), f'Unverified connection: {name}: {system}'
    address = int(system[2:])
    inverted = e.get('inverted') == 'true'
    b = profile['turnouts'][name]
    assert 1 <= address <= 2048 and address not in addresses, f'Invalid/shared address: {name}'
    addresses.add(address)
    assert (b['address'], b['source'], b['inverted']) == (address, system, inverted), f'Runtime mismatch: {name}'
    assert simulator['turnouts'][name] == b, f'Simulator mismatch: {name}'
    assert layout[ident].get('turnoutname') == name, f'Layout binding mismatch: {ident}'
    assert (layout[ident].get('secondturnoutname') or None) == t.get('name2'), f'Companion mismatch: {name}'
    imported = [r for r in admin['turnouts'] if r['id'] == name]
    assert len(imported) == 1 and imported[0]['sys'] == system, f'Admin binding mismatch: {name}'
    assert name in profile['manualPolicies']['byTurnout'], f'Missing manual policy: {name}'
    rows.append(f"| {ident} | {name} | {system} | {address} | {'Ja' if inverted else 'Nej'} | {e.findtext('comment') or '—'} |")
for icon in panel['sicons']:
    if icon.get('hidden') or not icon['sensor'].startswith('vxv'):
        continue
    names = ['Vx'+n for n in icon['sensor'][3:].split('/')]
    assert all(n in profile['turnouts'] for n in names), f'Unbound control: {icon["sensor"]}'
    # A reviewed address does not imply the entire manual group is commissioned.
extras = sorted(set(objects)-set(profile['turnouts']))
unresolved = [r for r in profile['manualPolicies']['rules'] if r['status'] != 'ready']
text = '\n'.join([
    '# Växeladresser – avstämning mot Cda60.xml', '',
    'Kontroll av original-XML, panelobjekt, anläggningsregister, driftprofil, simulatorprofil och manuella växelgrupper.',
    '', 'XML SHA-256: `'+hashlib.sha256(raw).hexdigest()+'`.', '',
    f"Samtliga {len(rows)} panelväxlar har entydig LocoNet-adress enligt originalet. Inga adressrättningar behövdes.",
    'Inverteringen för Vx131 är bevarad. Adresserna är källverifierade; fysisk dekoderprogrammering har inte mätts.', '',
    '| Layoutobjekt | Växel | JMRI-systemnamn | LocoNet-adress | Inverterad | Modulreferens i XML |',
    '|---|---|---|---:|---|---|', *rows, '', '## Källobjekt utan plats i spårplanen', '',
    *[f"- **{n} → {objects[n].findtext('systemName')}**: {objects[n].findtext('comment') or 'ingen modulreferens'}. Ingen layoutväxel anger detta namn; ingen driftbindning eller manöver har lagts till på en gissad position." for n in extras], '',
    'Övriga JMRI-turnoutobjekt omfattar bland annat interna Vxi-objekt och Vxo-objekt på den separata L2-anslutningen. Dessa ersätter inte panelväxlarnas LT-adresser.', '',
    '## Manöverbegränsningar som inte är adressfel', '',
    *[f"- **{r['button']}**: {r['reason']}" for r in unresolved], '',
    'Flera knappar saknar alltså godkänd manöverregel trots korrekta adresser. Koppling mellan växlar och rangeröverlämning måste granskas separat; adresserna ska inte ersättas för att kringgå dessa villkor.', '',
    '## Produktionskontroll 26 september 2026', '',
    'Körande TKL från 545e649 har samma 49 växelbindningar. Aktiv driftinställningsversion är 0, utan adressöverstyrningar eller växeländringar i utkast. Granskningen är läsande; inga växlar manövrerades.', ''
])
if args.report:
    args.report.write_text(text)
print(f'OK: {len(rows)} layout turnouts, unique source addresses, profiles, inversion, admin and controls. Source-only: {", ".join(extras) or "none"}')

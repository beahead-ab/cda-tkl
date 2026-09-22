#!/usr/bin/env python3
"""Independent read-back comparison of the shipped import against the original XML."""
import collections, hashlib, json
from pathlib import Path
import xml.etree.ElementTree as ET
root=Path(__file__).resolve().parents[1]
base=root/'public/data/source'; raw=(base/'Cda60.xml').read_bytes()
assert hashlib.sha256(raw).hexdigest()=='c69a865ae9a85cdb842d70c34d2573dde4b11c50f601a561d5b941136ac6fa87'
original=ET.fromstring(raw,parser=ET.XMLParser(target=ET.TreeBuilder(insert_comments=True,insert_pis=True)))
tree=json.loads((base/'tree.json').read_text()); index=json.loads((base/'index.json').read_text()); paths={}
def compare(element,node):
    tag=element.tag if isinstance(element.tag,str) else '#comment' if element.tag is ET.Comment else '#processing-instruction'
    assert tag==node['tag'],node['path']
    assert dict(element.attrib)==node['attrs'],node['path']
    assert element.text==node['text'],node['path']
    assert element.tail==node['tail'],node['path']
    assert len(element)==len(node['children']),node['path']
    assert node['path'] not in paths; paths[node['path']]=node
    for child,exported in zip(element,node['children']): compare(child,exported)
compare(original,tree)
assert len(paths)==index['meta']['nodeCount']==30432
assert sum(len(n['attrs']) for n in paths.values())==index['meta']['attributeCount']==96142
assert index['meta']['bytes']==len(raw)
assert index['meta']['sectionCount']==18
counts=collections.Counter(r['category'] for r in index['records'])
expected={'signals':66,'turnouts':727,'sensors':604,'blocks':404,'layoutBlocks':198,'memories':174,'signalLogics':56,'signalDestinations':117,'logix':25,'conditionals':1377,'eePairs':153,'layoutTurnouts':49,'segments':274,'points':220,'crossings':3,'turntables':1,'labels':522,'sensorIcons':268,'signalIcons':66,'blockIcons':44,'memoryIcons':7,'locoIcons':2,'controlPanel':62,'audio':3}
for key,n in expected.items(): assert counts[key]==n,(key,counts[key],n)
keys=set()
for record in index['records']:
    assert record['key'] not in keys;keys.add(record['key'])
    assert record['path'] in paths,record['path']
    assert len(record.get('noteKey','xml:'+record['key']))<=120
# Verify the actual values previously lost by the Claude summary export.
rule=next(n for n in paths.values() if n['tag']=='conditional' and n['attrs'].get('systemName')=='IX:AUTO:0002C1')
actions=[n['attrs'] for n in rule['children'] if n['tag']=='conditionalAction']
assert [n['data'] for n in actions]==['2','4','4','2']
assert all('option' in n and 'delay' in n and 'string' in n for n in actions)
assert any('dataString' in n['attrs'] and 'triggersCalc' in n['attrs'] for n in rule['children'])
turntable=next(n for n in paths.values() if n['tag']=='layoutturntable')
assert len(turntable['children'])==11
assert all('turnout' in n['attrs'] and 'turnoutstate' in n['attrs'] for n in turntable['children'])
admin=json.loads((root/'public/data/admin.json').read_text())
assert [a['data'] for a in admin['conditionals'][0]['acts']]==['2','4','4','2']
assert all('delay' in a and 'option' in a for a in admin['conditionals'][0]['acts'])
# Legacy note references survive; no name-based deduplication of physical LT/L2T objects.
assert next(r for r in index['records'] if r['category']=='signals' and r['name']=='6/9')['noteKey']=='signals:0'
assert len({r['path'] for r in index['records'] if r['category']=='turnouts'})==727
print('Verified: original bytes, all 30,432 nodes / 96,142 attributes, exact text/order, category counts, rules, turntable mappings and note identities.')

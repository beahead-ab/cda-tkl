#!/usr/bin/env python3
"""Compile operational source facts, without executing JMRI or external scripts."""
import argparse, collections, hashlib, json
from pathlib import Path
import xml.etree.ElementTree as E

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT/'public/data/source/Cda60.xml'

def build():
    raw=SOURCE.read_bytes(); r=E.fromstring(raw)
    rules={c.get('systemName'):dict(id=c.get('systemName'),name=c.get('userName'),attributes=dict(c.attrib),
        variables=[dict(v.attrib) for v in c.findall('conditionalStateVariable')],
        actions=[dict(a.attrib) for a in c.findall('conditionalAction')]) for c in r.findall('./conditionals/conditional')}
    groups=[]; scripts=collections.Counter()
    for g in r.findall('./logixs/logix'):
        refs=[c.get('systemName') for c in g.findall('logixConditional')]
        groups.append(dict(id=g.findtext('systemName'),name=g.findtext('userName') or 'Startinitiering',enabled=g.get('enabled')=='yes',
            rules=list(dict.fromkeys(refs)),references=refs,status='reference' if g.get('enabled')=='yes' else 'disabled-source'))
    policies=[]
    for c in rules.values():
        for a in c['actions']:
            if a['type']=='16':scripts[a.get('string','')]+=1
        if not c['id'].startswith('IX:AUTO:0013'):continue
        v=c['variables']; a=c['actions']
        first=next((x.get('dataString') for x in v if x['type']=='9' and x.get('systemName')=='Tryckt först' and x.get('dataString','').startswith(('htv','hvv'))),None)
        ends=[x['systemName'] for x in v if x['type']=='1' and x.get('systemName','').startswith('htv')]
        if not first or len(ends)!=1:continue
        last=ends[0]; denied=any(x['type']=='9' and x.get('systemName')=='Fel' and x.get('data')=='2' for x in a)
        commands=[x['systemName'] for x in a if x['type']=='9' and x.get('systemName','').startswith('tvs') and x.get('data')=='8']
        problems=[]
        if not first.startswith('htv'):problems.append('Minnesvärdet matchar inte knappens htv-identitet.')
        if c['name']!=first[3:]+'-'+last[3:]:problems.append('Regelnamn och faktiska knappvillkor skiljer sig.')
        if not denied and len(commands)!=2:problems.append('Exakt två bakomliggande NX-knappar saknas.')
        policies.append(dict(rule=c['id'],name=c['name'],fromButton=first,toButton=last,
            status='unresolved' if problems else 'denied' if denied else 'allowed',nxButtons=commands,problems=problems))
    l=r.find('LayoutEditor')
    anchors=[]
    for p in l.findall('positionablepoint'):
        a=dict(p.attrib)
        if any('signal' in k or 'sensor' in k for k in a):anchors.append(a)
    turnoutEnds=[]
    for t in l.findall('layoutturnout'):
        for leg in 'ABCD':
            mast=t.findtext('signal'+leg+'Mast'); sensor=t.findtext('sensor'+leg)
            if mast or sensor:turnoutEnds.append(dict(turnout=t.get('turnoutname'),id=t.get('ident'),leg=leg,mast=mast,sensor=sensor,segment=t.get('connect'+leg.lower()+'name')))
    nx=[dict(id=d.get('uniqueid'),fromSensor=s.get('item'),toSensor=d.get('item'),type=d.get('nxType'))
        for s in r.findall('./entryexitpairs/layoutPanel/source') for d in s.findall('destination')]
    relations=[dict(source=s.get('source'),destination=d.get('destination'),values={x.tag:x.text for x in d})
        for s in r.findall('./signalmastlogics/signalmastlogic') for d in s.findall('destinationMast')]
    sensors=[dict(system=s.findtext('systemName'),name=s.findtext('userName'),attributes=dict(s.attrib)) for s in r.findall('./sensors/sensor')]
    return dict(sourceHash=hashlib.sha256(raw).hexdigest(),groups=groups,rules=list(rules.values()),mainRoutePolicies=policies,
        anchors=anchors,turnoutEnds=turnoutEnds,nxPairs=nx,signalRelations=relations,sensors=sensors,
        externalScripts=dict(scripts),disabledGroups=[g['id'] for g in groups if not g['enabled']],
        note='Källfakta. Importerade regler är inte automatiskt aktiverade funktioner. Provbindningar är inte verifierade fysiska adresser.')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    data=build(); assert len(data['rules'])==1377 and len(data['mainRoutePolicies'])==376
    target=ROOT/'public/data/operations-source.json';content=json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n'
    if args.check:
        if target.read_text()!=content:raise SystemExit('Operational source import is stale')
    else:target.write_text(content)
    print(json.dumps(dict(rules=len(data['rules']),groups=len(data['groups']),policies=dict(collections.Counter(x['status'] for x in data['mainRoutePolicies'])),anchors=len(data['anchors']),turnoutEnds=len(data['turnoutEnds'])),ensure_ascii=False))

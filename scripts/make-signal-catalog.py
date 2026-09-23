#!/usr/bin/env python3
"""Read-only signal reference catalog; never derive hardware aspect codes."""
import argparse, hashlib, json, re
from pathlib import Path
import xml.etree.ElementTree as E

ROOT=Path(__file__).resolve().parents[1]
def read(path): return json.loads((ROOT/path).read_text())
def children(node,tag): return [n for n in node['children'] if n['tag']==tag]
def value(node,tag): return next((n['text'] for n in children(node,tag)),None)
def walk(node):
    yield node
    for child in node['children']: yield from walk(child)

def build():
    tree=read('public/data/source/tree.json');index=read('public/data/source/index.json')
    nodes=list(walk(tree));by_path={r['path']:r for r in index['records']}
    source_hash=hashlib.sha256((ROOT/'public/data/source/Cda60.xml').read_bytes()).hexdigest()
    if source_hash!=index['meta']['sha256']:raise ValueError('Signalunderlagets källfil har ändrats')
    assets=ROOT/'public/assets/mod59';manifest=read('public/assets/mod59/proveniens.json')
    files={f['localPath']:f for f in manifest['files']}
    def verified(file):
        if file not in files:raise ValueError('Resurs saknar proveniens: '+file)
        local='reference-icons/'+file.removeprefix('icons/') if file.startswith('icons/') else file
        raw=(assets/local).read_bytes()
        if hashlib.sha256(raw).hexdigest()!=files[file]['sha256']:raise ValueError('Ändrad bilddefinition: '+file)
        return raw
    outputs={}
    for n in nodes:
        if n['tag']=='turnout' and re.match(r'^/layout-config\[1\]/turnouts\[\d+\]/turnout\[',n['path']):
            for name in [value(n,'userName'),value(n,'systemName')]:
                if name:outputs[name]=n
    definitions={};images={}
    for file in files:
        if not file.startswith('definitions/appearance-'):continue
        definition=E.fromstring(verified(file));kind=file.removeprefix('definitions/appearance-').removesuffix('.xml')
        appearances={}
        for item in definition.findall('./appearances/appearance'):
            link=next((n.text for n in item.findall('imagelink') if n.get('type')=='mod59'),None)
            picture=None
            if link:
                filename=link.rsplit('/',1)[-1]
                if not re.fullmatch(r'[A-Za-z0-9+_-]+\.gif',filename):raise ValueError('Ogiltigt bildnamn')
                local='icons/'+filename;raw=verified(local)
                if raw[:6] not in [b'GIF87a',b'GIF89a']:raise ValueError('Ogiltig GIF')
                picture={'file':filename,'width':int.from_bytes(raw[6:8],'little'),'height':int.from_bytes(raw[8:10],'little'),'sha256':files[local]['sha256']}
                images[filename]=picture
            appearances[item.findtext('aspectname')]={'image':picture,'indications':[s.text for s in item.findall('show')],'definition':file}
        definitions[kind]=appearances
    relations=[]
    for logic in [n for n in nodes if n['tag']=='signalmastlogic']:
        for dest in children(logic,'destinationMast'):
            record=by_path[dest['path']]
            relations.append({'from':logic['attrs']['source'],'to':dest['attrs']['destination'],'enabled':value(dest,'enabled'),'sourcePath':dest['path'],'sourceKey':record['key']})
    masts=[]
    for node in [n for n in nodes if n['tag'] in ['turnoutsignalmast','virtualsignalmast']]:
        name=value(node,'userName');system=value(node,'systemName');kind=system.split(':')[-1].split('(')[0]
        virtual=node['tag']=='virtualsignalmast';record=by_path[node['path']];definition=definitions.get(kind)
        aspects=[]
        for aspect in children(node,'aspect'):
            ref=value(aspect,'turnout') or None;output=outputs.get(ref);title=aspect['attrs']['defines']
            appearance=(definition or {}).get(title)
            aspects.append({'name':title,'origin':'mast','sourcePath':aspect['path'],'turnoutRef':ref,
                'turnoutSystem':value(output,'systemName') if output else None,'turnoutState':value(aspect,'turnoutstate'),
                'turnoutKey':by_path[output['path']]['key'] if output else None,
                'outputStatus':'linked' if output else 'unresolved' if ref else 'missing',
                'image':appearance['image'] if appearance else None,
                'imageStatus':'matched' if appearance and appearance['image'] else 'type-missing' if definition is None else 'aspect-missing',
                'indications':appearance['indications'] if appearance else [],'definition':appearance['definition'] if appearance else None})
        if virtual and definition:
            for title,appearance in definition.items():
                aspects.append({'name':title,'origin':'type-definition','sourcePath':None,'turnoutRef':None,'turnoutSystem':None,'turnoutState':None,'turnoutKey':None,'outputStatus':'virtual',
                    'image':appearance['image'],'imageStatus':'matched' if appearance['image'] else 'aspect-missing','indications':appearance['indications'],'definition':appearance['definition']})
        for aspect in aspects:
            aspect['sameCommandAspects']=[a['name'] for a in aspects if aspect['turnoutSystem'] and a is not aspect and (a['turnoutSystem'],a['turnoutState'])==(aspect['turnoutSystem'],aspect['turnoutState'])]
        refs={a[k] for a in aspects for k in ['turnoutRef','turnoutSystem'] if a[k]}
        rules=[]
        for rule in [n for n in nodes if n['tag']=='conditional']:
            matches=[]
            for child in rule['children']:
                if child['tag'] not in ['conditionalStateVariable','conditionalAction']:continue
                attr=child['attrs'];target=attr.get('systemName');typ=attr.get('type')
                if target==name and ((child['tag']=='conditionalStateVariable' and typ=='30') or (child['tag']=='conditionalAction' and typ=='37')):matches.append('mast')
                if target in refs and ((child['tag']=='conditionalAction' and typ=='2') or (child['tag']=='conditionalStateVariable' and typ in ['3','4'])):matches.append('output')
            if matches:
                rules.append({'id':rule['attrs']['systemName'],'name':rule['attrs'].get('userName',''),'sourceKey':by_path[rule['path']]['key'],'sourcePath':rule['path'],'matches':sorted(set(matches))})
        icons=[{'sourcePath':n['path'],'sourceKey':by_path[n['path']]['key'],**n['attrs']} for n in nodes if n['tag']=='signalmasticon' and n['attrs'].get('signalmast')==name]
        masts.append({'name':name,'system':system,'type':kind,'virtual':virtual,'sourcePath':node['path'],'sourceKey':record['key'],'aspects':aspects,'icons':icons,'rules':rules,
            'outgoing':[r for r in relations if r['from']==name],'incoming':[r for r in relations if r['to']==name],
            'definitionStatus':'available' if definition is not None else 'missing'})
    source_aspects=[a for m in masts for a in m['aspects'] if a['origin']=='mast']
    return {'sourceHash':source_hash,'imageCommit':manifest['commit'],'images':list(images.values()),'masts':masts,
        'counts':{'masts':len(masts),'virtual':sum(m['virtual'] for m in masts),'sourceAspects':len(source_aspects),'linkedOutputs':sum(a['outputStatus']=='linked' for a in source_aspects),'missingOutputs':sum(a['outputStatus']=='missing' for a in source_aspects),'unresolvedOutputs':sum(a['outputStatus']=='unresolved' for a in source_aspects),'relations':len(relations)},
        'note':'Källreferens. Bild, utgångsorder och fysiskt återrapporterat besked är separata uppgifter.'}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    data=build();content=json.dumps(data,ensure_ascii=False,indent=2)+'\n';path=ROOT/'public/data/signal-catalog.json'
    if args.check:
        if path.read_text()!=content:raise SystemExit('Inaktuellt signalregister')
    else:path.write_text(content)
    print(json.dumps(data['counts'],ensure_ascii=False))

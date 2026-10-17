// Vilken station den här installationen kör. En installation kör en station, som en TMBox står på en station.
// CHARLOTTENDAL_STATION väljer bland katalogerna i stations/ som har en genererad profil; standard är charlottendal,
// vars filer ligger kvar där de alltid legat (profiles/, public/data). Anroparen kan inte ange en sökväg.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const DEFAULT_STATION = 'charlottendal';
export function stationIds() {
  const dir = ROOT + 'stations';
  const found = fs.existsSync(dir) ? fs.readdirSync(dir).filter(id => /^[a-z0-9-]+$/.test(id) && fs.existsSync(`${dir}/${id}/station.json`) && fs.existsSync(`${dir}/${id}/profiles/network.json`)) : [];
  return [DEFAULT_STATION, ...found.filter(id => id !== DEFAULT_STATION)];
}
export function currentStation(env = process.env) {
  const id = env.CHARLOTTENDAL_STATION || DEFAULT_STATION;
  if (!stationIds().includes(id)) throw Error('Okänd station: ' + id + '. Finns: ' + stationIds().join(', ') + '.');
  if (id === DEFAULT_STATION) return { id, title: 'Charlottendal', builtIn: true, dataDir: ROOT + 'public/data', profile: null, field: null };
  const dir = `${ROOT}stations/${id}`, station = JSON.parse(fs.readFileSync(dir + '/station.json', 'utf8'));
  return { id, title: station.title, signature: station.signature, builtIn: false, dataDir: dir + '/data', profile: dir + '/profiles/network.json', field: dir + '/profiles/field.json' };
}
// Driftdata (lås, journal, inställningar): var/ för Charlottendal, var/<id>/ för en annan station, så att två stationers
// lås aldrig blandas. CHARLOTTENDAL_STATE_DIR gäller före båda.
export function stateDirectory(env = process.env, station = currentStation(env)) {
  if (env.CHARLOTTENDAL_STATE_DIR) return env.CHARLOTTENDAL_STATE_DIR;
  return ROOT + 'var' + (station.builtIn ? '' : '/' + station.id);
}
// En fil i stationens data (panel.json, train-fields.json …): Charlottendals ligger i public/data.
export function stationData(file, station = currentStation()) { return JSON.parse(fs.readFileSync(station.dataDir + '/' + file, 'utf8')); }

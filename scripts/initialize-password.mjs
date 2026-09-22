import fs from 'node:fs';
import { initializePassword } from '../src/password-auth.mjs';
const file = process.env.CHARLOTTENDAL_AUTH_FILE;
if (!file) throw Error('Ange CHARLOTTENDAL_AUTH_FILE');
const password = fs.readFileSync(0, 'utf8').replace(/\r?\n$/, '');
await initializePassword(file, password);
console.log('Tillfälligt lösenord sparat som scrypt-hash. Byte krävs vid första inloggningen.');

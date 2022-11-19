import {dirname} from 'desm';
import {resolve} from 'node:path';

export const cwd = resolve(dirname(import.meta.url), '..');

import {filename} from 'desm';
import {resolve, parse} from 'node:path';

export const cwd = resolve(parse(filename(import.meta.url)).dir, '..');

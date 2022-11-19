import {parse} from 'node:path';
import {findUp} from 'find-up';
import {readFile} from 'node:fs/promises';

export async function findRootDir() {
  const root = await findUp('package.json');

  if (root) {
    const {version, name} = JSON.parse(
      await readFile(root, {
        encoding: 'utf-8',
      })
    );

    return {
      version,
      name,
      rootDir: parse(root).dir,
    };
  } else {
    throw new Error('package.json missing');
  }
}

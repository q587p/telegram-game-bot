import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// Register ts-node ESM loader for the current project
register('ts-node/esm', pathToFileURL('./'));

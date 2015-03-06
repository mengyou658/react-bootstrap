/* eslint no-process-exit: 0 */

import path from 'path';
import yargs from 'yargs';
import { exec, spawn } from 'child-process-promise';

import preConditions from './pre-conditions';
import versionBump from './version-bump';
import addChangelog from './changelog';
import repoRelease from './repo-release';
import tagAndPublish from './tag-and-publish';
import test from './test';
import build from '../build';

const argv = yargs
  .usage('Usage: $0 <version> [--preid <identifier>]')
  .example('$0 minor --preid beta', 'Release with minor version bump with pre-release tag')
  .example('$0 major', 'Release with major version bump')
  .command('patch', 'Release patch')
  .command('minor', 'Release minor')
  .command('major', 'Release major')
  .command('<version>', 'Release specific version')
  .option('preid', {
    demand: false,
    describe: 'pre-release identifier',
    type: 'string'
  })
  .demand(1)
  .argv;

let version;
const repoRoot = process.cwd();

const bowerRepo = 'git@github.com:mtscout6/react-bootstrap-bower.git';
const docsRepo = 'git@github.com:mtscout6/react-bootstrap.github.io.git';

const bowerRoot = path.join(repoRoot, 'amd/');
const docsRoot = path.join(repoRoot, 'docs-built/');

const tmpBowerRepo = path.join(repoRoot, 'tmp-bower-repo');
const tmpDocsRepo = path.join(repoRoot, 'tmp-docs-repo');

const versionBumpOptions = {
  preid: argv.preid,
  type: argv._[0]
};

preConditions()
  .then(test)
  .then(versionBump(repoRoot, versionBumpOptions))
  .then(v => { version = v; })
  .then(() => addChangelog(repoRoot, version))
  .then(() => {
    return build(true)
      .catch(err => {
        console.log('Build failed, reverting version bump'.red);

        return exec('git reset HEAD .')
          .then(() => exec('git checkout package.json'))
          .then(() => exec('git checkout CHANGELOG.md'))
          .then(() => console.log('Version bump reverted'.red))
          .then(() => {
            throw err;
          });
      });
  })
  .then(() => exec(`git commit -m "Release v${version}"`))
  .then(() => Promise.all([
    tagAndPublish(version),
    repoRelease(bowerRepo, bowerRoot, tmpBowerRepo, version),
    repoRelease(docsRepo, docsRoot, tmpDocsRepo, version)
  ]))
  .then(() => console.log('Version '.cyan + `v${version}`.green + ' released!'.cyan))
  .catch(err => {
    if (!err.__handled) {
      console.error(err.message.red);
    }

    process.exit(1);
  });

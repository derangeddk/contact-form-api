#!/usr/bin/env node
const { spawn } = require('child_process');
const pkg = require('../package.json');

const name = `${pkg.containerRegistry}/${pkg.name}:${pkg.version}`;

function xSpawn(str) {
  const array = str.split(' ');
  return spawn(array[0], array.slice(1));
}

async function runCommand(command) {
  const child = xSpawn(command.trim());

  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);

  return new Promise(res => child.on('close', res));
}

async function run() {
  await runCommand(`docker build . --tag ${name}`);
  await runCommand(`docker push ${name}`);
}

run().catch(console.error); // eslint-disable-line no-console

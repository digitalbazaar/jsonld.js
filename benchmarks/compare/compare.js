#!/usr/bin/env node

import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import {promises as fs} from 'node:fs';
import {markdownTable} from 'markdown-table';
import commonPathPrefix from 'common-path-prefix';

yargs(hideBin(process.argv))
  .alias('h', 'help')
  .option('verbose', {
    alias: 'v',
    type: 'count',
    description: 'Run with verbose logging'
  })
  .option('relative', {
    alias: 'r',
    type: 'boolean',
    default: false,
    description: 'Show % relative difference'
  })
  .option('format', {
    alias: 'f',
    choices: ['markdown'],
    default: 'markdown',
    description: 'Output format'
  })
  .option('env', {
    alias: 'e',
    choices: ['none', 'all', 'combined'],
    default: 'none',
    description: 'Output environment format'
  })
  .command(
    '$0 <file...>',
    'compare JSON-LD benchmark files', () => {},
    async argv => {
      return compare(argv);
    })
  .parse();

async function compare({
  env,
  file,
  //format,
  relative,
  //verbose
}) {
  const contents = await Promise.all(file.map(async f => ({
    fn: f,
    content: await fs.readFile(f, 'utf8')
  })));
  const results = contents
    .map(c => ({
      fn: c.fn,
      content: JSON.parse(c.content),
      // map of test id => assertion
      testMap: new Map()
    }))
    .map(c => ({
      ...c,
      // FIXME process properly
      env: c.content['@included'][0],
      label: c.content['@included'][0]['jldb:label']
    }));
  //console.log(JSON.stringify(results, null, 2));
  // order of tests found in each result set
  // TODO: provider interleaved mode for new results in
  const seen = new Set();
  const ordered = [];
  results.forEach(r => {
    r.content.subjectOf.forEach(a => {
      //console.log(a);
      const t = a['earl:test'];
      if(!seen.has(t)) {
        ordered.push(t);
      }
      seen.add(t);
      r.testMap.set(t, a);
    });
  });
  //console.log(ordered);
  const tprefixlen = commonPathPrefix(ordered).length;
  function hz(a) {
    return a['jldb:result']['jldb:hz'];
  }
  function rfmt(base, a) {
    return relative ? (100 * (a - base) / base) : a;
  }
  const compared = ordered.map(t => [
    t.slice(tprefixlen),
    hz(results[0].testMap.get(t)).toFixed(2),
    ...results.slice(1)
      .map(r => rfmt(
        hz(results[0].testMap.get(t)),
        hz(r.testMap.get(t))))
      .map(d => relative ? d.toFixed(2) + '%' : d.toFixed(2))
  ]);
  //console.log(compared);
  //console.log(results);
  const fnprefixlen = commonPathPrefix(file).length;
  console.log('## Comparison');
  console.log(markdownTable([
    [
      'Test',
      ...results.map(r => r.label || r.fn.slice(fnprefixlen))
    ],
    ...compared
  ], {
    align: [
      'l',
      ...results.map(() => 'r')
    ]
  }));
  console.log();
  if(relative) {
    console.log('> base ops/s and relative difference (higher is better)');
  } else {
    console.log('> ops/s (higher is better)');
  }

  const envProps = [
    ['Label', 'jldb:label'],
    ['Arch', 'jldb:arch'],
    ['CPU', 'jldb:cpu'],
    ['CPUs', 'jldb:cpuCount'],
    ['Platform', 'jldb:platform'],
    ['Runtime', 'jldb:runtime'],
    ['Runtime Version', 'jldb:runtimeVersion'],
    ['Comment', 'jldb:comment']
  ];

  if(env === 'all') {
    console.log();
    console.log('## Environment');
    console.log(markdownTable([
      envProps.map(p => p[0]),
      ...results.map(r => envProps.map(p => r.env[p[1]] || ''))
    ]));
  }

  if(env === 'combined') {
    console.log();
    console.log('## Environment');
    function envline(key, prop) {
      const values = new Set(results
        .map(r => r.env[prop])
        .filter(v => v !== undefined)
      );
      return [key, values.size ? [...values].join(', ') : []];
    }
    console.log(markdownTable([
      ['Key', 'Values'],
      ...envProps
        .map(p => envline(p[0], p[1]))
        .filter(p => p[1].length)
    ]));
  }
}

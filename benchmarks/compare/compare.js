#!/usr/bin/env node

import commonPathPrefix from 'common-path-prefix';
import {promises as fs} from 'node:fs';
import {hideBin} from 'yargs/helpers';
import {markdownTable} from 'markdown-table';
import yargs from 'yargs';

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
    choices: ['none', 'all', 'present', 'combined'],
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
  //console.log(contents);
  const results = contents
    .map(c => ({
      fn: c.fn,
      content: JSON.parse(c.content),
      // map of test id => assertion
      testMap: new Map()
    }))
    .map(c => {
      //console.log('C', c);
      return c;
    })
    .map(c => ({
      ...c,
      env: c.content['@included']?.[0] || {},
      label: c.content['@included']?.[0]?.['jldb:label']
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
  //console.log('COMPARED', compared);
  //console.log('RESULTS', results);
  const fnprefixlen = commonPathPrefix(file).length;
  function label(res) {
    return res.label || res.fn.slice(fnprefixlen);
  }
  console.log('## Comparison');
  console.log(markdownTable([
    [
      'Test',
      ...results.map(label)
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

  // show all properites
  if(env === 'all') {
    console.log();
    console.log('## Environment');
    //const data = results.map(r => envProps.map(p => {
    //  return (p[1] === 'jldb:label') ? label(r) : r.env[p[1]] || '';
    //}));
    const data = results.map(r => [
      label(r),
      ...envProps.slice(1).map(p => r.env[p[1]] || '')
    ]);
    if(data.length > 0) {
      console.log(markdownTable([
        envProps.map(p => p[0]),
        ...data
      ]));
    } else {
      console.log('*not specified*');
    }
  }

  // show present properites
  if(env === 'present') {
    console.log();
    console.log('## Environment');
    // get all data
    const data = results.map(r => [
      label(r),
      ...envProps.slice(1).map(p => r.env[p[1]] || '')
    ]);
    // count present truthy fields per col
    const propCounts = envProps.slice(1)
      .map(p => results.reduce((c, r) => r.env[p[1]] ? ++c : c, 0));
    const presentProps = [
      envProps[0],
      ...envProps.slice(1).filter((v, i) => propCounts[i] > 0)
    ];
    const presentData = data.map(d => ([
      d[0],
      ...d.slice(1).filter((v, i) => propCounts[i] > 0)
    ]));
    if(data.length > 0) {
      console.log(markdownTable([
        presentProps.map(p => p[0]),
        ...presentData
      ]));
    } else {
      console.log('*not specified*');
    }
  }

  // show combined grouping of properties
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
    const data = envProps
      .map(p => envline(p[0], p[1]))
      .filter(p => p[1].length);
    if(data.length > 0) {
      console.log(markdownTable([
        ['Key', 'Values'],
        ...data
      ]));
    } else {
      console.log('*not specified*');
    }
  }
}

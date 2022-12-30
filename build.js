#!/usr/bin/env node
const { build, cliopts } = require('estrella')
const { readFileSync } = require('fs')
const path = require('path')

const builtIns = {
  // crypto: require.resolve('crypto-browserify'),
  // stream: require.resolve('stream-browserify'),
  // buffer: require.resolve('./node_modules/buffer/index.js')
}

const workerLoader = () => {
  return {
    name: 'worker-loader',
    setup(plugin) {
      plugin.onResolve({ filter: /(.+)-webworker(?:\.dev)?\.js$/ }, (args) => {
        return { path: args.path, namespace: 'workerUrl' }
      })
      plugin.onLoad({ filter: /(.+)-webworker(?:\.dev)?\.js$/, namespace: 'workerUrl' }, async (args) => {
        const dest = require.resolve(args.path)
        return { contents: `export default ${JSON.stringify(readFileSync(dest).toString())};` }
      })
    },
  }
}

const nodeBuiltIns = () => {
  const include = Object.keys(builtIns)
  if (!include.length) {
    throw new Error('Must specify at least one built-in module')
  }
  const filter = RegExp(`^(${include.join('|')})$`)
  return {
    name: 'node-builtins',
    setup(build) {
      build.onResolve({ filter }, (arg) => ({
        path: builtIns[arg.path],
      }))
    },
  }
}

const commonOptions = {
  bundle: true,
  minify: !cliopts.watch,
  sourcemap: cliopts.watch ? 'both' : undefined,
  sourceRoot: path.resolve('.'),
  sourcesContent: !!cliopts.watch,
  treeShaking: true,
  plugins: [
    // nodeBuiltIns(),
    workerLoader(),
  ],
}

build({
  ...commonOptions,
  entry: 'src/index.ts',
  outfile: 'static/index.js',
  tsconfig: 'tsconfig.json',
  inject: ['src/inject.js'],
})

// Run a local web server with livereload when -watch is set
cliopts.watch && require('./runTestServer')

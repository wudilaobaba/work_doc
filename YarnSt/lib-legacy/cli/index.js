'use strict';

var _promise;

function _load_promise() {
  return _promise = _interopRequireDefault(require('babel-runtime/core-js/promise'));
}

var _toConsumableArray2;

function _load_toConsumableArray() {
  return _toConsumableArray2 = _interopRequireDefault(require('babel-runtime/helpers/toConsumableArray'));
}

var _index;

function _load_index() {
  return _index = require('../reporters/index.js');
}

var _index2;

function _load_index2() {
  return _index2 = require('../registries/index.js');
}

var _index3;

function _load_index3() {
  return _index3 = _interopRequireDefault(require('./commands/index.js'));
}

var _constants;

function _load_constants() {
  return _constants = _interopRequireWildcard(require('../constants.js'));
}

var _network;

function _load_network() {
  return _network = _interopRequireWildcard(require('../util/network.js'));
}

var _errors;

function _load_errors() {
  return _errors = require('../errors.js');
}

var _config;

function _load_config() {
  return _config = _interopRequireDefault(require('../config.js'));
}

var _rc;

function _load_rc() {
  return _rc = require('../rc.js');
}

var _yarnVersion;

function _load_yarnVersion() {
  return _yarnVersion = require('../util/yarn-version.js');
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const commander = require('commander');

const fs = require('fs');
const invariant = require('invariant');
const lockfile = require('proper-lockfile');
const loudRejection = require('loud-rejection');
const net = require('net');
const onDeath = require('death');
const path = require('path');

loudRejection();

const startArgs = process.argv.slice(0, 2);

// ignore all arguments after a --
const doubleDashIndex = process.argv.findIndex(element => element === '--');
const args = process.argv.slice(2, doubleDashIndex === -1 ? process.argv.length : doubleDashIndex);
const endArgs = doubleDashIndex === -1 ? [] : process.argv.slice(doubleDashIndex + 1, process.argv.length);

// set global options
commander.version((_yarnVersion || _load_yarnVersion()).version);
commander.usage('[command] [flags]');
commander.option('--verbose', 'output verbose messages on internal operations');
commander.option('--offline', 'trigger an error if any required dependencies are not available in local cache');
commander.option('--prefer-offline', 'use network only if dependencies are not available in local cache');
commander.option('--strict-semver');
commander.option('--json', '');
commander.option('--ignore-scripts', "don't run lifecycle scripts");
commander.option('--har', 'save HAR output of network traffic');
commander.option('--ignore-platform', 'ignore platform checks');
commander.option('--ignore-engines', 'ignore engines check');
commander.option('--ignore-optional', 'ignore optional dependencies');
commander.option('--force', 'install and build packages even if they were built before, overwrite lockfile');
commander.option('--skip-integrity-check', 'run install without checking if node_modules is installed');
commander.option('--check-files', 'install will verify file tree of packages for consistency');
commander.option('--no-bin-links', "don't generate bin links when setting up packages");
commander.option('--flat', 'only allow one version of a package');
commander.option('--prod, --production [prod]', '');
commander.option('--no-lockfile', "don't read or generate a lockfile");
commander.option('--pure-lockfile', "don't generate a lockfile");
commander.option('--frozen-lockfile', "don't generate a lockfile and fail if an update is needed");
commander.option('--link-duplicates', 'create hardlinks to the repeated modules in node_modules');
commander.option('--global-folder <path>', 'specify a custom folder to store global packages');
commander.option('--modules-folder <path>', 'rather than installing modules into the node_modules folder relative to the cwd, output them here');
commander.option('--cache-folder <path>', 'specify a custom folder to store the yarn cache');
commander.option('--mutex <type>[:specifier]', 'use a mutex to ensure only one yarn instance is executing');
commander.option('--no-emoji', 'disable emoji in output');
commander.option('-s, --silent', 'skip Yarn console logs, other types of logs (script output) will be printed');
commander.option('--proxy <host>', '');
commander.option('--https-proxy <host>', '');
commander.option('--no-progress', 'disable progress bar');
commander.option('--network-concurrency <number>', 'maximum number of concurrent network requests', parseInt);
commander.option('--network-timeout <milliseconds>', 'TCP timeout for network requests', parseInt);
commander.option('--non-interactive', 'do not show interactive prompts');

// get command name
let commandName = args.shift() || 'install';

if (commandName === '--help' || commandName === '-h') {
  commandName = 'help';
}

if (args.indexOf('--help') >= 0 || args.indexOf('-h') >= 0) {
  args.unshift(commandName);
  commandName = 'help';
}

// if no args or command name looks like a flag then set default to `install`
if (commandName[0] === '-') {
  args.unshift(commandName);
  commandName = 'install';
}

let command;
if (Object.prototype.hasOwnProperty.call((_index3 || _load_index3()).default, commandName)) {
  command = (_index3 || _load_index3()).default[commandName];
}

// if command is not recognized, then set default to `run`
if (!command) {
  args.unshift(commandName);
  command = (_index3 || _load_index3()).default.run;
}

command.setFlags(commander);
commander.parse([].concat((0, (_toConsumableArray2 || _load_toConsumableArray()).default)(startArgs), [
// we use this for https://github.com/tj/commander.js/issues/346, otherwise
// it will strip some args that match with any options
'this-arg-will-get-stripped-later'], (0, (_toConsumableArray2 || _load_toConsumableArray()).default)((0, (_rc || _load_rc()).getRcArgs)(commandName)), (0, (_toConsumableArray2 || _load_toConsumableArray()).default)(args)));
commander.args = commander.args.concat(endArgs);

// we strip cmd
console.assert(commander.args.length >= 1);
console.assert(commander.args[0] === 'this-arg-will-get-stripped-later');
commander.args.shift();

//
const Reporter = commander.json ? (_index || _load_index()).JSONReporter : (_index || _load_index()).ConsoleReporter;
const reporter = new Reporter({
  emoji: commander.emoji && process.stdout.isTTY && process.platform === 'darwin',
  verbose: commander.verbose,
  noProgress: !commander.progress,
  isSilent: commander.silent
});

reporter.initPeakMemoryCounter();

const config = new (_config || _load_config()).default(reporter);
const outputWrapper = !commander.json && command.hasWrapper(commander, commander.args);

if (outputWrapper) {
  reporter.header(commandName, { name: 'yarn', version: (_yarnVersion || _load_yarnVersion()).version });
}

if (command.noArguments && commander.args.length) {
  reporter.error(reporter.lang('noArguments'));
  reporter.info(command.getDocsInfo);
  process.exit(1);
}

//
if (commander.yes) {
  reporter.warn(reporter.lang('yesWarning'));
}

//
if (!commander.offline && (_network || _load_network()).isOffline()) {
  reporter.warn(reporter.lang('networkWarning'));
}

//
if (command.requireLockfile && !fs.existsSync(path.join(config.cwd, (_constants || _load_constants()).LOCKFILE_FILENAME))) {
  reporter.error(reporter.lang('noRequiredLockfile'));
  process.exit(1);
}

//
const run = () => {
  invariant(command, 'missing command');
  return command.run(config, reporter, commander, commander.args).then(() => {
    reporter.close();
    if (outputWrapper) {
      reporter.footer(false);
    }
  });
};

//
const runEventuallyWithFile = (mutexFilename, isFirstTime) => {
  return new (_promise || _load_promise()).default(ok => {
    const lockFilename = mutexFilename || path.join(config.cwd, (_constants || _load_constants()).SINGLE_INSTANCE_FILENAME);
    lockfile.lock(lockFilename, { realpath: false }, (err, release) => {
      if (err) {
        if (isFirstTime) {
          reporter.warn(reporter.lang('waitingInstance'));
        }
        setTimeout(() => {
          ok(runEventuallyWithFile(mutexFilename, isFirstTime));
        }, 200); // do not starve the CPU
      } else {
        onDeath(() => {
          process.exit(1);
        });
        ok(run().then(release));
      }
    });
  });
};

//
const runEventuallyWithNetwork = mutexPort => {
  return new (_promise || _load_promise()).default(ok => {
    const connectionOptions = {
      port: +mutexPort || (_constants || _load_constants()).SINGLE_INSTANCE_PORT
    };

    const server = net.createServer();

    server.on('error', () => {
      // another Yarn instance exists, let's connect to it to know when it dies.
      reporter.warn(reporter.lang('waitingInstance'));
      const socket = net.createConnection(connectionOptions);

      socket.on('connect', () => {
        // Allow the program to exit if this is the only active server in the event system.
        socket.unref();
      }).on('close', hadError => {
        // the `close` event gets always called after the `error` event
        if (!hadError) {
          process.nextTick(() => {
            ok(runEventuallyWithNetwork(mutexPort));
          });
        }
      }).on('error', () => {
        // No server to listen to ? Let's retry to become the next server then.
        process.nextTick(() => {
          ok(runEventuallyWithNetwork(mutexPort));
        });
      });
    });

    const onServerEnd = () => {
      server.close();
      return (_promise || _load_promise()).default.resolve();
    };

    // open the server and continue only if succeed.
    server.listen(connectionOptions, () => {
      // ensure the server gets closed properly on SIGNALS.
      onDeath(onServerEnd);

      ok(run().then(onServerEnd));
    });
  });
};

function onUnexpectedError(err) {
  function indent(str) {
    return '\n  ' + str.trim().split('\n').join('\n  ');
  }

  const log = [];
  log.push(`Arguments: ${indent(process.argv.join(' '))}`);
  log.push(`PATH: ${indent(process.env.PATH || 'undefined')}`);
  log.push(`Yarn version: ${indent((_yarnVersion || _load_yarnVersion()).version)}`);
  log.push(`Node version: ${indent(process.versions.node)}`);
  log.push(`Platform: ${indent(process.platform + ' ' + process.arch)}`);

  // add manifests
  for (const registryName of (_index2 || _load_index2()).registryNames) {
    const possibleLoc = path.join(config.cwd, (_index2 || _load_index2()).registries[registryName].filename);
    const manifest = fs.existsSync(possibleLoc) ? fs.readFileSync(possibleLoc, 'utf8') : 'No manifest';
    log.push(`${registryName} manifest: ${indent(manifest)}`);
  }

  // lockfile
  const lockLoc = path.join(config.cwd, (_constants || _load_constants()).LOCKFILE_FILENAME);
  const lockfile = fs.existsSync(lockLoc) ? fs.readFileSync(lockLoc, 'utf8') : 'No lockfile';
  log.push(`Lockfile: ${indent(lockfile)}`);

  log.push(`Trace: ${indent(err.stack)}`);

  const errorReportLoc = writeErrorReport(log);

  reporter.error(reporter.lang('unexpectedError', err.message));

  if (errorReportLoc) {
    reporter.info(reporter.lang('bugReport', errorReportLoc));
  }
}

function writeErrorReport(log) {
  const errorReportLoc = config.enableMetaFolder ? path.join(config.cwd, (_constants || _load_constants()).META_FOLDER, 'yarn-error.log') : path.join(config.cwd, 'yarn-error.log');

  try {
    fs.writeFileSync(errorReportLoc, log.join('\n\n') + '\n');
  } catch (err) {
    reporter.error(reporter.lang('fileWriteError', errorReportLoc, err.message));
    return undefined;
  }

  return errorReportLoc;
}

config.init({
  binLinks: commander.binLinks,
  modulesFolder: commander.modulesFolder,
  globalFolder: commander.globalFolder,
  cacheFolder: commander.cacheFolder,
  preferOffline: commander.preferOffline,
  captureHar: commander.har,
  ignorePlatform: commander.ignorePlatform,
  ignoreEngines: commander.ignoreEngines,
  ignoreScripts: commander.ignoreScripts,
  offline: commander.preferOffline || commander.offline,
  looseSemver: !commander.strictSemver,
  production: commander.production,
  httpProxy: commander.proxy,
  httpsProxy: commander.httpsProxy,
  networkConcurrency: commander.networkConcurrency,
  nonInteractive: commander.nonInteractive,
  commandName: commandName === 'run' ? commander.args[0] : commandName
}).then(() => {
  // option "no-progress" stored in yarn config
  const noProgressConfig = config.registries.yarn.getOption('no-progress');

  if (noProgressConfig) {
    reporter.disableProgress();
  }

  const exit = () => {
    process.exit(0);
  };
  // verbose logs outputs process.uptime() with this line we can sync uptime to absolute time on the computer
  reporter.verbose(`current time: ${new Date().toISOString()}`);

  const mutex = commander.mutex;
  if (mutex && typeof mutex === 'string') {
    const parts = mutex.split(':');
    const mutexType = parts.shift();
    const mutexSpecifier = parts.join(':');

    if (mutexType === 'file') {
      return runEventuallyWithFile(mutexSpecifier, true).then(exit);
    } else if (mutexType === 'network') {
      return runEventuallyWithNetwork(mutexSpecifier).then(exit);
    } else {
      throw new (_errors || _load_errors()).MessageError(`Unknown single instance type ${mutexType}`);
    }
  } else {
    return run().then(exit);
  }
}).catch(err => {
  reporter.verbose(err.stack);

  if (err instanceof (_errors || _load_errors()).MessageError) {
    reporter.error(err.message);
  } else {
    onUnexpectedError(err);
  }

  if ((_index3 || _load_index3()).default[commandName]) {
    reporter.info((_index3 || _load_index3()).default[commandName].getDocsInfo);
  }

  process.exit(1);
});
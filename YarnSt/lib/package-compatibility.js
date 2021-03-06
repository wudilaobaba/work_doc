'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.testEngine = testEngine;

var _errors;

function _load_errors() {
  return _errors = require('./errors.js');
}

var _map;

function _load_map() {
  return _map = _interopRequireDefault(require('./util/map.js'));
}

var _misc;

function _load_misc() {
  return _misc = require('./util/misc.js');
}

var _yarnVersion;

function _load_yarnVersion() {
  return _yarnVersion = require('./util/yarn-version.js');
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const invariant = require('invariant');
const semver = require('semver');

const VERSIONS = Object.assign({}, process.versions, {
  yarn: (_yarnVersion || _load_yarnVersion()).version
});

function isValid(items, actual) {
  let isNotWhitelist = true;
  let isBlacklist = false;

  for (const item of items) {
    // blacklist
    if (item[0] === '!') {
      isBlacklist = true;

      if (actual === item.slice(1)) {
        return false;
      }
      // whitelist
    } else {
      isNotWhitelist = false;

      if (item === actual) {
        return true;
      }
    }
  }

  // npm allows blacklists and whitelists to be mixed. Blacklists with
  // whitelisted items should be treated as whitelists.
  return isBlacklist && isNotWhitelist;
}

const aliases = (0, (_map || _load_map()).default)({
  iojs: 'node' });

const ignore = ['npm', // we'll never satisfy this for obvious reasons
'teleport', // a module bundler used by some modules
'rhino'];

function testEngine(name, range, versions, looseSemver) {
  const actual = versions[name];
  if (!actual) {
    return false;
  }

  if (!semver.valid(actual, looseSemver)) {
    return false;
  }

  if (semver.satisfies(actual, range, looseSemver)) {
    return true;
  }

  if (name === 'node' && semver.gt(actual, '1.0.0', looseSemver)) {
    // WARNING: this is a massive hack and is super gross but necessary for compatibility
    // some modules have the `engines.node` field set to a caret version below semver major v1
    // eg. ^0.12.0. this is problematic as we enforce engines checks and node is now on version >=1
    // to allow this pattern we transform the node version to fake ones in the minor range 10-13
    const major = semver.major(actual, looseSemver);
    const fakes = [`0.10.${major}`, `0.11.${major}`, `0.12.${major}`, `0.13.${major}`];
    for (const actualFake of fakes) {
      if (semver.satisfies(actualFake, range, looseSemver)) {
        return true;
      }
    }
  }

  // incompatible version
  return false;
}

class PackageCompatibility {
  constructor(config, resolver, ignoreEngines) {
    this.reporter = config.reporter;
    this.resolver = resolver;
    this.config = config;
    this.ignoreEngines = ignoreEngines;
  }

  static isValidArch(archs) {
    return isValid(archs, process.arch);
  }

  static isValidPlatform(platforms) {
    return isValid(platforms, process.platform);
  }

  check(info) {
    let didIgnore = false;
    let didError = false;
    const reporter = this.reporter;
    const human = `${info.name}@${info.version}`;

    const pushError = msg => {
      const ref = info._reference;
      invariant(ref, 'expected package reference');

      if (ref.optional) {
        ref.ignore = true;
        ref.incompatible = true;

        reporter.warn(`${human}: ${msg}`);
        if (!didIgnore) {
          reporter.info(reporter.lang('optionalCompatibilityExcluded', human));
          didIgnore = true;
        }
      } else {
        reporter.error(`${human}: ${msg}`);
        didError = true;
      }
    };

    const invalidPlatform = !this.config.ignorePlatform && Array.isArray(info.os) && info.os.length > 0 && !PackageCompatibility.isValidPlatform(info.os);
    if (invalidPlatform) {
      pushError(this.reporter.lang('incompatibleOS', process.platform));
    }

    const invalidCpu = !this.config.ignorePlatform && Array.isArray(info.cpu) && info.cpu.length > 0 && !PackageCompatibility.isValidArch(info.cpu);
    if (invalidCpu) {
      pushError(this.reporter.lang('incompatibleCPU', process.arch));
    }

    if (!this.ignoreEngines && typeof info.engines === 'object') {
      for (const entry of (0, (_misc || _load_misc()).entries)(info.engines)) {
        let name = entry[0];
        const range = entry[1];

        if (aliases[name]) {
          name = aliases[name];
        }

        if (VERSIONS[name]) {
          if (!testEngine(name, range, VERSIONS, this.config.looseSemver)) {
            pushError(this.reporter.lang('incompatibleEngine', name, range));
          }
        } else if (ignore.indexOf(name) < 0) {
          this.reporter.warn(`${human}: ${this.reporter.lang('invalidEngine', name)}`);
        }
      }
    }

    if (didError) {
      throw new (_errors || _load_errors()).MessageError(reporter.lang('foundIncompatible'));
    }
  }

  init() {
    const infos = this.resolver.getManifests();
    for (const info of infos) {
      this.check(info);
    }
    return Promise.resolve();
  }
}
exports.default = PackageCompatibility;
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.run = undefined;

var _assign;

function _load_assign() {
  return _assign = _interopRequireDefault(require('babel-runtime/core-js/object/assign'));
}

var _keys;

function _load_keys() {
  return _keys = _interopRequireDefault(require('babel-runtime/core-js/object/keys'));
}

var _asyncToGenerator2;

function _load_asyncToGenerator() {
  return _asyncToGenerator2 = _interopRequireDefault(require('babel-runtime/helpers/asyncToGenerator'));
}

let run = exports.run = (() => {
  var _ref = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* (config, reporter, flags, args) {
    if (args.length > 2) {
      reporter.error(reporter.lang('tooManyArguments', 2));
      return;
    }

    let packageName = args.shift() || '.';

    // Handle the case when we are referencing a local package.
    if (packageName === '.') {
      packageName = (yield config.readRootManifest()).name;
    }

    const packageInput = (_npmRegistry || _load_npmRegistry()).default.escapeName(packageName);

    var _parsePackageName = (0, (_parsePackageName2 || _load_parsePackageName()).default)(packageInput);

    const name = _parsePackageName.name,
          version = _parsePackageName.version;

    // pass application/json Accept to get full metadata for info command

    let result = yield config.registries.npm.request(name, {
      headers: { 'Accept': 'application/json' }
    });
    if (!result) {
      reporter.error(reporter.lang('infoFail'));
      return;
    }

    result = clean(result);

    const versions = result.versions;
    // $FlowFixMe
    result.versions = (0, (_keys || _load_keys()).default)(versions).sort(semver.compareLoose);
    result.version = version || result.versions[result.versions.length - 1];
    result = (0, (_assign || _load_assign()).default)(result, versions[result.version]);

    const fieldPath = args.shift();
    const fields = fieldPath ? fieldPath.split('.') : [];

    // Readmes can be long so exclude them unless explicitly asked for.
    if (fields[0] !== 'readme') {
      delete result.readme;
    }

    result = fields.reduce(function (prev, cur) {
      return prev && prev[cur];
    }, result);
    reporter.inspect(result);
  });

  return function run(_x, _x2, _x3, _x4) {
    return _ref.apply(this, arguments);
  };
})();

exports.setFlags = setFlags;
exports.hasWrapper = hasWrapper;

var _npmRegistry;

function _load_npmRegistry() {
  return _npmRegistry = _interopRequireDefault(require('../../registries/npm-registry.js'));
}

var _parsePackageName2;

function _load_parsePackageName() {
  return _parsePackageName2 = _interopRequireDefault(require('../../util/parse-package-name.js'));
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const semver = require('semver');

function clean(object) {
  if (Array.isArray(object)) {
    const result = [];
    object.forEach(item => {
      item = clean(item);
      if (item) {
        result.push(item);
      }
    });
    return result;
  } else if (typeof object === 'object') {
    const result = {};
    for (const key in object) {
      if (key.startsWith('_')) {
        continue;
      }

      const item = clean(object[key]);
      if (item) {
        result[key] = item;
      }
    }
    return result;
  } else if (object) {
    return object;
  } else {
    return null;
  }
}

function setFlags() {}

function hasWrapper() {
  return true;
}
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray2;

function _load_slicedToArray() {
  return _slicedToArray2 = _interopRequireDefault(require('babel-runtime/helpers/slicedToArray'));
}

var _asyncToGenerator2;

function _load_asyncToGenerator() {
  return _asyncToGenerator2 = _interopRequireDefault(require('babel-runtime/helpers/asyncToGenerator'));
}

var _fs;

function _load_fs() {
  return _fs = _interopRequireWildcard(require('../util/fs.js'));
}

var _npmResolver;

function _load_npmResolver() {
  return _npmResolver = _interopRequireDefault(require('../resolvers/registries/npm-resolver.js'));
}

var _envReplace;

function _load_envReplace() {
  return _envReplace = _interopRequireDefault(require('../util/env-replace.js'));
}

var _baseRegistry;

function _load_baseRegistry() {
  return _baseRegistry = _interopRequireDefault(require('./base-registry.js'));
}

var _misc;

function _load_misc() {
  return _misc = require('../util/misc');
}

var _isRequestToRegistry;

function _load_isRequestToRegistry() {
  return _isRequestToRegistry = _interopRequireDefault(require('./is-request-to-registry.js'));
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const userHome = require('../util/user-home-dir').default;

const path = require('path');
const url = require('url');
const ini = require('ini');

const DEFAULT_REGISTRY = 'https://registry.npmjs.org/';

function getGlobalPrefix() {
  if (process.env.PREFIX) {
    return process.env.PREFIX;
  } else if (process.platform === 'win32') {
    // c:\node\node.exe --> prefix=c:\node\
    return path.dirname(process.execPath);
  } else {
    // /usr/local/bin/node --> prefix=/usr/local
    let prefix = path.dirname(path.dirname(process.execPath));

    // destdir only is respected on Unix
    if (process.env.DESTDIR) {
      prefix = path.join(process.env.DESTDIR, prefix);
    }

    return prefix;
  }
}

class NpmRegistry extends (_baseRegistry || _load_baseRegistry()).default {
  constructor(cwd, registries, requestManager, reporter) {
    super(cwd, registries, requestManager, reporter);
    this.folder = 'node_modules';
  }

  static escapeName(name) {
    // scoped packages contain slashes and the npm registry expects them to be escaped
    return name.replace('/', '%2f');
  }

  request(pathname) {
    let opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    const registry = (0, (_misc || _load_misc()).addSuffix)(this.getRegistry(pathname), '/');
    const requestUrl = url.resolve(registry, pathname);
    const alwaysAuth = this.getScopedOption(registry.replace(/^https?:/, ''), 'always-auth') || this.getOption('always-auth') || (0, (_misc || _load_misc()).removePrefix)(requestUrl, registry)[0] === '@';

    const headers = Object.assign({
      'Accept': 'application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*'
    }, opts.headers);
    if (this.token || alwaysAuth && (0, (_isRequestToRegistry || _load_isRequestToRegistry()).default)(requestUrl, registry)) {
      const authorization = this.getAuth(pathname);
      if (authorization) {
        headers.authorization = authorization;
      }
    }

    return this.requestManager.request({
      url: requestUrl,
      method: opts.method,
      body: opts.body,
      auth: opts.auth,
      headers,
      json: !opts.buffer,
      buffer: opts.buffer,
      process: opts.process,
      gzip: true
    });
  }

  checkOutdated(config, name, range) {
    var _this = this;

    return (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* () {
      const req = yield _this.request(NpmRegistry.escapeName(name));
      if (!req) {
        throw new Error('couldnt find ' + name);
      }

      const repository = req.repository,
            homepage = req.homepage;

      const url = homepage || repository && repository.url || '';

      return {
        latest: req['dist-tags'].latest,
        wanted: (yield (_npmResolver || _load_npmResolver()).default.findVersionInRegistryResponse(config, range, req)).version,
        url
      };
    })();
  }

  getPossibleConfigLocations(filename, reporter) {
    var _this2 = this;

    return (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* () {
      const possibles = [[false, path.join(_this2.cwd, filename)], [true, _this2.config.userconfig || path.join(userHome, filename)], [false, path.join(getGlobalPrefix(), filename)]];

      const foldersFromRootToCwd = _this2.cwd.split(path.sep);
      while (foldersFromRootToCwd.length > 1) {
        possibles.push([false, path.join(foldersFromRootToCwd.join(path.sep), filename)]);
        foldersFromRootToCwd.pop();
      }

      const actuals = [];
      for (const _ref of possibles) {
        var _ref2 = (0, (_slicedToArray2 || _load_slicedToArray()).default)(_ref, 2);

        const isHome = _ref2[0];
        const loc = _ref2[1];

        reporter.verbose(reporter.lang('configPossibleFile', loc));
        if (yield (_fs || _load_fs()).exists(loc)) {
          reporter.verbose(reporter.lang('configFileFound', loc));
          actuals.push([isHome, loc, yield (_fs || _load_fs()).readFile(loc)]);
        }
      }
      return actuals;
    })();
  }

  loadConfig() {
    var _this3 = this;

    return (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* () {
      // docs: https://docs.npmjs.com/misc/config
      _this3.mergeEnv('npm_config_');

      for (const _ref3 of yield _this3.getPossibleConfigLocations('.npmrc', _this3.reporter)) {
        var _ref4 = (0, (_slicedToArray2 || _load_slicedToArray()).default)(_ref3, 3);

        const loc = _ref4[1];
        const file = _ref4[2];

        const config = (_baseRegistry || _load_baseRegistry()).default.normalizeConfig(ini.parse(file));
        for (const key in config) {
          config[key] = (0, (_envReplace || _load_envReplace()).default)(config[key]);
        }

        // normalize offline mirror path relative to the current npmrc
        const offlineLoc = config['yarn-offline-mirror'];
        // don't normalize if we already have a mirror path
        if (!_this3.config['yarn-offline-mirror'] && offlineLoc) {
          const mirrorLoc = config['yarn-offline-mirror'] = path.resolve(path.dirname(loc), offlineLoc);
          yield (_fs || _load_fs()).mkdirp(mirrorLoc);
        }

        _this3.config = Object.assign({}, config, _this3.config);
      }
    })();
  }

  getScope(packageName) {
    return !packageName || packageName[0] !== '@' ? '' : packageName.split(/\/|%2f/)[0];
  }

  getRegistry(packageName) {
    // Try extracting registry from the url, then scoped registry, and default registry
    if (packageName.match(/^https?:/)) {
      const availableRegistries = this.getAvailableRegistries();
      const registry = availableRegistries.find(registry => packageName.startsWith(registry));
      if (registry) {
        return registry;
      }
    }

    for (const scope of [this.getScope(packageName), '']) {
      const registry = this.getScopedOption(scope, 'registry') || this.registries.yarn.getScopedOption(scope, 'registry');
      if (registry) {
        return String(registry);
      }
    }

    return DEFAULT_REGISTRY;
  }

  getAuth(packageName) {
    if (this.token) {
      return this.token;
    }

    for (let registry of [this.getRegistry(packageName), '', DEFAULT_REGISTRY]) {
      registry = registry.replace(/^https?:/, '');

      // Check for bearer token.
      let auth = this.getScopedOption(registry.replace(/\/?$/, '/'), '_authToken');
      if (auth) {
        return `Bearer ${String(auth)}`;
      }

      // Check for basic auth token.
      auth = this.getScopedOption(registry, '_auth');
      if (auth) {
        return `Basic ${String(auth)}`;
      }

      // Check for basic username/password auth.
      const username = this.getScopedOption(registry, 'username');
      const password = this.getScopedOption(registry, '_password');
      if (username && password) {
        const pw = new Buffer(String(password), 'base64').toString();
        return 'Basic ' + new Buffer(String(username) + ':' + pw).toString('base64');
      }
    }

    return '';
  }

  getScopedOption(scope, option) {
    return this.getOption(scope + (scope ? ':' : '') + option);
  }
}
exports.default = NpmRegistry;
NpmRegistry.filename = 'package.json';
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LocalTarballFetcher = undefined;

var _asyncToGenerator2;

function _load_asyncToGenerator() {
  return _asyncToGenerator2 = _interopRequireDefault(require('babel-runtime/helpers/asyncToGenerator'));
}

var _http;

function _load_http() {
  return _http = _interopRequireDefault(require('http'));
}

var _errors;

function _load_errors() {
  return _errors = require('../errors.js');
}

var _constants;

function _load_constants() {
  return _constants = _interopRequireWildcard(require('../constants.js'));
}

var _crypto;

function _load_crypto() {
  return _crypto = _interopRequireWildcard(require('../util/crypto.js'));
}

var _baseFetcher;

function _load_baseFetcher() {
  return _baseFetcher = _interopRequireDefault(require('./base-fetcher.js'));
}

var _fs;

function _load_fs() {
  return _fs = _interopRequireWildcard(require('../util/fs.js'));
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const path = require('path');
const tarFs = require('tar-fs');
const url = require('url');
const fs = require('fs');
const stream = require('stream');
const gunzip = require('gunzip-maybe');

class TarballFetcher extends (_baseFetcher || _load_baseFetcher()).default {
  setupMirrorFromCache() {
    var _this = this;

    return (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* () {
      const tarballMirrorPath = _this.getTarballMirrorPath();
      const tarballCachePath = _this.getTarballCachePath();

      if (tarballMirrorPath == null) {
        return;
      }

      if (!(yield (_fs || _load_fs()).exists(tarballMirrorPath)) && (yield (_fs || _load_fs()).exists(tarballCachePath))) {
        // The tarball doesn't exists in the offline cache but does in the cache; we import it to the mirror
        yield (_fs || _load_fs()).copy(tarballCachePath, tarballMirrorPath, _this.reporter);
      }
    })();
  }

  getLocalAvailabilityStatus() {
    var _this2 = this;

    return (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* () {
      const tarballMirrorPath = _this2.getTarballMirrorPath();
      const tarballCachePath = _this2.getTarballCachePath();

      if (tarballMirrorPath != null && (yield (_fs || _load_fs()).exists(tarballMirrorPath))) {
        return true;
      }

      if (yield (_fs || _load_fs()).exists(tarballCachePath)) {
        return true;
      }

      return false;
    })();
  }

  getTarballCachePath() {
    return path.join(this.dest, (_constants || _load_constants()).TARBALL_FILENAME);
  }

  getTarballMirrorPath() {
    var _url$parse = url.parse(this.reference);

    const pathname = _url$parse.pathname;


    if (pathname == null) {
      return null;
    }

    // handle scoped packages
    const pathParts = pathname.replace(/^\//, '').split(/\//g);

    const packageFilename = pathParts.length >= 2 && pathParts[0][0] === '@' ? `${pathParts[0]}-${pathParts[pathParts.length - 1]}` // scopped
    : `${pathParts[pathParts.length - 1]}`;

    return this.config.getOfflineMirrorPath(packageFilename);
  }

  createExtractor(resolve, reject) {
    const validateStream = new (_crypto || _load_crypto()).HashStream();
    const extractorStream = gunzip();
    const untarStream = tarFs.extract(this.dest, {
      strip: 1,
      dmode: 0o555, // all dirs should be readable
      fmode: 0o444, // all files should be readable
      chown: false });

    extractorStream.pipe(untarStream).on('error', reject).on('finish', () => {
      const expectHash = this.hash;
      const actualHash = validateStream.getHash();
      if (!expectHash || expectHash === actualHash) {
        resolve({
          hash: actualHash
        });
      } else {
        reject(new (_errors || _load_errors()).SecurityError(this.config.reporter.lang('fetchBadHash', expectHash, actualHash)));
      }
    });

    return { validateStream, extractorStream };
  }

  fetchFromLocal(override) {
    var _this3 = this;

    return (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* () {
      const tarballMirrorPath = _this3.getTarballMirrorPath();
      const tarballCachePath = _this3.getTarballCachePath();

      const tarballPath = path.resolve(_this3.config.cwd, override || tarballMirrorPath || tarballCachePath);

      if (!tarballPath || !(yield (_fs || _load_fs()).exists(tarballPath))) {
        throw new (_errors || _load_errors()).MessageError(_this3.config.reporter.lang('tarballNotInNetworkOrCache', _this3.reference, tarballPath));
      }

      return new Promise(function (resolve, reject) {
        var _createExtractor = _this3.createExtractor(resolve, reject);

        const validateStream = _createExtractor.validateStream,
              extractorStream = _createExtractor.extractorStream;

        const cachedStream = fs.createReadStream(tarballPath);

        cachedStream.pipe(validateStream).pipe(extractorStream).on('error', function (err) {
          reject(new (_errors || _load_errors()).MessageError(_this3.config.reporter.lang('fetchErrorCorrupt', err.message, tarballPath)));
        });
      });
    })();
  }

  fetchFromExternal() {
    const registry = this.config.registries[this.registry];

    return registry.request(this.reference, {
      headers: {
        'Accept-Encoding': 'gzip',
        'Accept': 'application/octet-stream'
      },
      buffer: true,
      process: (req, resolve, reject) => {
        const reporter = this.config.reporter;
        // should we save this to the offline cache?

        const tarballMirrorPath = this.getTarballMirrorPath();
        const tarballCachePath = this.getTarballCachePath();

        var _createExtractor2 = this.createExtractor(resolve, reject);

        const validateStream = _createExtractor2.validateStream,
              extractorStream = _createExtractor2.extractorStream;


        const handleRequestError = res => {
          if (res.statusCode >= 400) {
            // $FlowFixMe
            const statusDescription = (_http || _load_http()).default.STATUS_CODES[res.statusCode];
            reject(new Error(reporter.lang('requestFailed', `${res.statusCode} ${statusDescription}`)));
          }
        };

        req.on('response', handleRequestError);
        req.pipe(validateStream);

        if (tarballMirrorPath) {
          validateStream.pipe(fs.createWriteStream(tarballMirrorPath)).on('error', reject);
        }

        if (tarballCachePath) {
          validateStream.pipe(fs.createWriteStream(tarballCachePath)).on('error', reject);
        }

        validateStream.pipe(extractorStream).on('error', reject);
      }
    });
  }

  _fetch() {
    var _this4 = this;

    return (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* () {
      const urlParse = url.parse(_this4.reference);

      const isFilePath = urlParse.protocol ? urlParse.protocol.match(/^[a-z]:$/i) : urlParse.pathname ? urlParse.pathname.match(/^(?:\.{1,2})?[\\\/]/) : false;

      if (isFilePath) {
        return yield _this4.fetchFromLocal(_this4.reference);
      }

      if (yield _this4.getLocalAvailabilityStatus()) {
        return yield _this4.fetchFromLocal();
      } else {
        return yield _this4.fetchFromExternal();
      }
    })();
  }
}

exports.default = TarballFetcher;
class LocalTarballFetcher extends TarballFetcher {
  _fetch() {
    return this.fetchFromLocal(this.reference);
  }
}
exports.LocalTarballFetcher = LocalTarballFetcher;
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.examples = exports.setFlags = exports.run = undefined;

var _slicedToArray2;

function _load_slicedToArray() {
  return _slicedToArray2 = _interopRequireDefault(require('babel-runtime/helpers/slicedToArray'));
}

var _extends2;

function _load_extends() {
  return _extends2 = _interopRequireDefault(require('babel-runtime/helpers/extends'));
}

var _asyncToGenerator2;

function _load_asyncToGenerator() {
  return _asyncToGenerator2 = _interopRequireDefault(require('babel-runtime/helpers/asyncToGenerator'));
}

let getManifests = (() => {
  var _ref = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* (config, flags) {
    const lockfile = yield (_wrapper || _load_wrapper()).default.fromDirectory(config.cwd);
    const install = new (_install || _load_install()).Install((0, (_extends2 || _load_extends()).default)({ skipIntegrityCheck: true }, flags), config, new (_baseReporter || _load_baseReporter()).default(), lockfile);
    yield install.hydrate(true, true);

    let manifests = install.resolver.getManifests();

    // sort by name
    manifests = manifests.sort(function (a, b) {
      if (!a.name && !b.name) {
        return 0;
      }

      if (!a.name) {
        return 1;
      }

      if (!b.name) {
        return -1;
      }

      return a.name.localeCompare(b.name);
    });

    // filter ignored manifests
    manifests = manifests.filter(function (manifest) {
      const ref = manifest._reference;
      return !!ref && !ref.ignore;
    });

    return manifests;
  });

  return function getManifests(_x, _x2) {
    return _ref.apply(this, arguments);
  };
})();

exports.hasWrapper = hasWrapper;

var _baseReporter;

function _load_baseReporter() {
  return _baseReporter = _interopRequireDefault(require('../../reporters/base-reporter.js'));
}

var _install;

function _load_install() {
  return _install = require('./install.js');
}

var _wrapper;

function _load_wrapper() {
  return _wrapper = _interopRequireDefault(require('../../lockfile/wrapper.js'));
}

var _buildSubCommands2;

function _load_buildSubCommands() {
  return _buildSubCommands2 = _interopRequireDefault(require('./_build-sub-commands.js'));
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const invariant = require('invariant');

function hasWrapper(flags, args) {
  return args[0] != 'generate-disclaimer';
}

var _buildSubCommands = (0, (_buildSubCommands2 || _load_buildSubCommands()).default)('licenses', {
  ls(config, reporter, flags, args) {
    return (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* () {
      const manifests = yield getManifests(config, flags);

      if (flags.json) {
        const body = [];

        for (const _ref2 of manifests) {
          const name = _ref2.name,
                version = _ref2.version,
                license = _ref2.license,
                repository = _ref2.repository,
                homepage = _ref2.homepage,
                author = _ref2.author;


          const url = repository ? repository.url : homepage;
          const vendorUrl = homepage || author && author.url;
          const vendorName = author && author.name;
          body.push([name, version, license || 'Unknown', url || 'Unknown', vendorUrl || 'Unknown', vendorName || 'Unknown']);
        }

        reporter.table(['Name', 'Version', 'License', 'URL', 'VendorUrl', 'VendorName'], body);
      } else {
        const trees = [];

        for (const _ref3 of manifests) {
          const name = _ref3.name,
                version = _ref3.version,
                license = _ref3.license,
                repository = _ref3.repository,
                homepage = _ref3.homepage;

          const children = [];
          children.push({ name: `${reporter.format.bold('License:')} ${license || reporter.format.red('UNKNOWN')}` });

          const url = repository ? repository.url : homepage;
          if (url) {
            children.push({ name: `${reporter.format.bold('URL:')} ${url}` });
          }

          trees.push({
            name: `${name}@${version}`,
            children
          });
        }

        reporter.tree('licenses', trees);
      }
    })();
  },

  generateDisclaimer(config, reporter, flags, args) {
    return (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* () {
      const manifests = yield getManifests(config, flags);
      const manifest = yield config.readRootManifest();

      // Create a map of license text to manifest so that packages with exactly
      // the same license text are grouped together.
      const manifestsByLicense = new Map();
      for (const manifest of manifests) {
        const licenseText = manifest.licenseText;

        if (!licenseText) {
          continue;
        }

        if (!manifestsByLicense.has(licenseText)) {
          manifestsByLicense.set(licenseText, new Map());
        }

        const byLicense = manifestsByLicense.get(licenseText);
        invariant(byLicense, 'expected value');
        byLicense.set(manifest.name, manifest);
      }

      console.log('THE FOLLOWING SETS FORTH ATTRIBUTION NOTICES FOR THIRD PARTY SOFTWARE THAT MAY BE CONTAINED ' + `IN PORTIONS OF THE ${String(manifest.name).toUpperCase().replace(/-/g, ' ')} PRODUCT.`);
      console.log();

      for (const _ref4 of manifestsByLicense) {
        var _ref5 = (0, (_slicedToArray2 || _load_slicedToArray()).default)(_ref4, 2);

        const licenseText = _ref5[0];
        const manifests = _ref5[1];

        console.log('-----');
        console.log();

        const names = [];
        const urls = [];
        for (const _ref6 of manifests) {
          var _ref7 = (0, (_slicedToArray2 || _load_slicedToArray()).default)(_ref6, 2);

          const name = _ref7[0];
          const repository = _ref7[1].repository;

          names.push(name);
          if (repository && repository.url) {
            urls.push(manifests.size === 1 ? repository.url : `${repository.url} (${name})`);
          }
        }

        const heading = [];
        heading.push(`The following software may be included in this product: ${names.join(', ')}.`);
        if (urls.length > 0) {
          heading.push(`A copy of the source code may be downloaded from ${urls.join(', ')}.`);
        }
        heading.push('This software contains the following license and notice below:');

        console.log(heading.join(' '));
        console.log();

        if (licenseText) {
          console.log(licenseText.trim());
        } else {
          // what do we do here? base it on `license`?
        }

        console.log();
      }
    })();
  }
});

const run = _buildSubCommands.run,
      setFlags = _buildSubCommands.setFlags,
      examples = _buildSubCommands.examples;
exports.run = run;
exports.setFlags = setFlags;
exports.examples = examples;
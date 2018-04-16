const async = require('async');
const path = require('path');
const shelljs = require('shelljs');

function compileBambooContract(filename, compileABI, callback) {
  const abiOrByteCode = compileABI ? "--abi" : "";
  shelljs.exec(`bamboo ${abiOrByteCode} < ${filename}`, {silent: true}, (code, stdout, stderr) => {
    if (stderr) {
      return callback(stderr);
    }
    if (code !== 0) {
      return callback(`Bamboo exited with error code ${code}`);
    }
    if (!stdout) {
      return callback('Execution returned nothing');
    }
    callback(null, stdout);
  });
}

function compileBamboo(logger, contractFiles, cb) {
  if (!contractFiles || !contractFiles.length) {
    return cb();
  }
  logger.info("compiling Bamboo contracts...");
  const compiled_object = {};
  async.each(contractFiles,
    function (file, fileCb) {
      const className = path.basename(file.filename).split('.')[0];
      compiled_object[className] = {};
      async.parallel([
        function getByteCode(paraCb) {
          compileBambooContract(file.filename, false, (err, byteCode) => {
            if (err) {
              return paraCb(err);
            }
            compiled_object[className].runtimeBytecode = byteCode;
            compiled_object[className].realRuntimeBytecode = byteCode;
            compiled_object[className].code = byteCode;
            paraCb();
          });
        },
        function getABI(paraCb) {
          compileBambooContract(file.filename, true, (err, ABIString) => {
            if (err) {
              return paraCb(err);
            }
            let ABI = [];
            try {
              ABI = JSON.parse(ABIString);
            } catch (e) {
              return paraCb('ABI is not valid JSON');
            }
            compiled_object[className].abiDefinition = ABI;
            paraCb();
          });
        }
      ], fileCb);
    },
    function (err) {
      cb(err, compiled_object);
    });
}

module.exports = {
  compileBamboo,
  compileBambooContract
};

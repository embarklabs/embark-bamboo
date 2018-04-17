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
    callback(null, stdout.replace(/\n/g, ''));
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

            // TODO remove this patch when Bamboo is fixed
            // Bamboo has an issue where there are wrong characters before: https://github.com/pirapira/bamboo/issues/279
            const byteCodeStart = byteCode.indexOf('0x');
            if (byteCodeStart < 0) {
              return paraCb('Bytecode is not valid');
            }
            byteCode = byteCode.substr(byteCodeStart);

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
            // TODO remove this patch when Bamboo is fixed
            // Bamboo has an issue where the JSON is not correct sometimes: https://github.com/pirapira/bamboo/issues/279
            const firstBracket = ABIString.indexOf('[');
            if (firstBracket < 0) {
              return paraCb('ABI is not valid JSON');
            }
            ABIString = ABIString.substr(firstBracket);

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

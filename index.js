/*global require, module*/
const async = require('async');
const path = require('path');

module.exports = (embark) => {
  embark.registerCompiler('bbo', compileBamboo);

  function compileBamboo(contractFiles, cb) {
    if (!contractFiles || !contractFiles.length) {
      return cb();
    }
    async.waterfall([
      function compileContracts(callback) {
        embark.logger.info("Compiling Bamboo contracts...");
        const compiled_object = {};
        async.each(contractFiles,
          function (file, fileCb) {
            const className = path.basename(file.filename).split('.')[0];
            compiled_object[className] = {};
            async.parallel([
              function getByteCode(paraCb) {
                shelljs.exec(`vyper ${file.filename}`, {silent: true}, (code, stdout, stderr) => {
                  if (stderr) {
                    return paraCb(stderr);
                  }
                  if (code !== 0) {
                    return paraCb(`Vyper exited with error code ${code}`);
                  }
                  if (!stdout) {
                    return paraCb('Execution returned no bytecode');
                  }
                  const byteCode = stdout.replace(/\n/g, '');
                  compiled_object[className].runtimeBytecode = byteCode;
                  compiled_object[className].realRuntimeBytecode = byteCode;
                  compiled_object[className].code = byteCode;
                  paraCb();
                });
              },
              function getABI(paraCb) {
                shelljs.exec(`vyper -f json ${file.filename}`, {silent: true}, (code, stdout, stderr) => {
                  if (stderr) {
                    return paraCb(stderr);
                  }
                  if (code !== 0) {
                    return paraCb(`Vyper exited with error code ${code}`);
                  }
                  if (!stdout) {
                    return paraCb('Execution returned no ABI');
                  }
                  let ABI = [];
                  try {
                    ABI = JSON.parse(stdout.replace(/\n/g, ''));
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
            callback(err, compiled_object);
          });
      }
    ], function (err, result) {
      cb(err, result);
    });
  }
};

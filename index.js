/*global require, module*/
const Compiler = require("./lib/Compiler");

module.exports = (embark) => {
  embark.registerCompiler('.bbo', compileBamboo);

  function compileBamboo(contractFiles, cb) {
    if (!contractFiles || !contractFiles.length) {
      return cb();
    }
    Compiler.compileBamboo(embark.logger, contractFiles, cb);
  }
};

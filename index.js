module.exports = (embark) => {
  embark.registerCompiler('bbo', compileBamboo);

  function compileBamboo(contractFiles, cb) {
    // TODO Add code to compile the contracts
    cb();
  }
};

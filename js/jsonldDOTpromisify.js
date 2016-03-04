export const jsonldDOTpromisify = function(op) {
  
  var args = Array.prototype.slice.call(arguments, 1);
  return new Promise(function(resolve, reject) {
    op.apply(null, args.concat(function(err, value) {
      if(!err) {
        resolve(value);
      } else {
        reject(err);
      }
    }));
  });
};

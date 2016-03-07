import {_clone} from './_clone';
import {URDNA2015} from './URDNA2015';
export const URGNA2012 = (function() {

var Normalize = function(options) {
  URDNA2015.call(this, options);
  this.name = 'URGNA2012';
};
Normalize.prototype = new URDNA2015();

// helper for modifying component during Hash First Degree Quads
Normalize.prototype.modifyFirstDegreeComponent = function(id, component, key) {
  if(component.type !== 'blank node') {
    return component;
  }
  component = _clone(component);
  if(key === 'name') {
    component.value = '_:g';
  } else {
    component.value = (component.value === id ? '_:a' : '_:z');
  }
  return component;
};

// helper for getting a related predicate
Normalize.prototype.getRelatedPredicate = function(quad) {
  return quad.predicate.value;
};

// helper for creating hash to related blank nodes map
Normalize.prototype.createHashToRelated = function(id, issuer, callback) {
  var self = this;

  // 1) Create a hash to related blank nodes map for storing hashes that
  // identify related blank nodes.
  var hashToRelated = {};

  // 2) Get a reference, quads, to the list of quads in the blank node to
  // quads map for the key identifier.
  var quads = self.blankNodeInfo[id].quads;

  // 3) For each quad in quads:
  self.forEach(quads, function(quad, idx, callback) {
    // 3.1) If the quad's subject is a blank node that does not match
    // identifier, set hash to the result of the Hash Related Blank Node
    // algorithm, passing the blank node identifier for subject as related,
    // quad, path identifier issuer as issuer, and p as position.
    var position;
    var related;
    if(quad.subject.type === 'blank node' && quad.subject.value !== id) {
      related = quad.subject.value;
      position = 'p';
    } else if(quad.object.type === 'blank node' && quad.object.value !== id) {
      // 3.2) Otherwise, if quad's object is a blank node that does not match
      // identifier, to the result of the Hash Related Blank Node algorithm,
      // passing the blank node identifier for object as related, quad, path
      // identifier issuer as issuer, and r as position.
      related = quad.object.value;
      position = 'r';
    } else {
      // 3.3) Otherwise, continue to the next quad.
      return callback();
    }
    // 3.4) Add a mapping of hash to the blank node identifier for the
    // component that matched (subject or object) to hash to related blank
    // nodes map, adding an entry as necessary.
    self.hashRelatedBlankNode(
      related, quad, issuer, position, function(err, hash) {
      if(hash in hashToRelated) {
        hashToRelated[hash].push(related);
      } else {
        hashToRelated[hash] = [related];
      }
      callback();
    });
  }, function(err) {
    callback(err, hashToRelated);
  });
};

return Normalize;

})(); 
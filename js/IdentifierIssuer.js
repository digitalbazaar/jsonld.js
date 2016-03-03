import {_clone} from './_clone';
export const IdentifierIssuer = function(prefix) {
  this.prefix = prefix;
  this.counter = 0;
  this.existing = {};
}

IdentifierIssuer.prototype.clone = function() {
  var copy = new IdentifierIssuer(this.prefix);
  copy.counter = this.counter;
  copy.existing = _clone(this.existing);
  return copy;
};


IdentifierIssuer.prototype.getId = function(old) {
  // return existing old identifier
  if(old && old in this.existing) {
    return this.existing[old];
  }

  // get next identifier
  var identifier = this.prefix + this.counter;
  this.counter += 1;

  // save mapping
  if(old) {
    this.existing[old] = identifier;
  }

  return identifier;
};


IdentifierIssuer.prototype.getName = IdentifierIssuer.prototype.getName;


IdentifierIssuer.prototype.hasId = function(old) {
  return (old in this.existing);
};


IdentifierIssuer.prototype.isNamed = IdentifierIssuer.prototype.hasId;


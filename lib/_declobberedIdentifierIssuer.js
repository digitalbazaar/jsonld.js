import {_clone} from './_clone';
export function _declobberedIdentifierIssuer(prefix) {
      this.prefix = prefix;
      this.counter = 0;
      this.existing = {};
    }

_declobberedIdentifierIssuer.prototype.clone = function() {
      var copy = new _declobberedIdentifierIssuer(this.prefix);
      copy.counter = this.counter;
      copy.existing = _clone(this.existing);
      return copy;
    };


_declobberedIdentifierIssuer.prototype.getId = function(old) {
      // return existing old identifier
      if (old && old in this.existing) {
        return this.existing[old];
      }

      // get next identifier
      var identifier = this.prefix + this.counter;
      this.counter += 1;

      // save mapping
      if (old) {
        this.existing[old] = identifier;
      }

      return identifier;
    };


_declobberedIdentifierIssuer.prototype.getName = _declobberedIdentifierIssuer.prototype.getName;


_declobberedIdentifierIssuer.prototype.hasId = function(old) {
      return (old in this.existing);
    };


_declobberedIdentifierIssuer.prototype.isNamed = _declobberedIdentifierIssuer.prototype.hasId;


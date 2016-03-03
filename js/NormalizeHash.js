import {URGNA2012} from './URGNA2012';
import {URDNA2015} from './URDNA2015';
import {RDF} from './RDF';
export const NormalizeHash = function(algorithm) {
  if(!(this instanceof NormalizeHash)) {
    return new NormalizeHash(algorithm);
  }
  if(['URDNA2015', 'URGNA2012'].indexOf(algorithm) === -1) {
    throw new Error(
      'Invalid RDF Dataset Normalization algorithm: ' + algorithm);
  }
  NormalizeHash._init.call(this, algorithm);
};

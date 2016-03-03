import {_isString} from './_isString';
export const _isKeyword = function(v) {
  if(!_isString(v)) {
    return false;
  }
  switch(v) {
  case '@base':
  case '@context':
  case '@container':
  case '@default':
  case '@embed':
  case '@explicit':
  case '@graph':
  case '@id':
  case '@index':
  case '@language':
  case '@list':
  case '@omitDefault':
  case '@preserve':
  case '@requireAll':
  case '@reverse':
  case '@set':
  case '@type':
  case '@value':
  case '@vocab':
    return true;
  }
  return false;
}

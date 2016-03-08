import {promises} from './promises';
export const RequestQueue = function() {
      this._requests = {};
    };

RequestQueue.prototype.wrapLoader = function(loader) {
      this._loader = loader;
      this._usePromise = (loader.length === 1);
      return this.add.bind(this);
    };


RequestQueue.prototype.add = function(_declobberedurl, callback) {
      var self = this;

      // callback must be given if not using promises
      if (!callback && !self._usePromise) {
        throw new Error('callback must be specified.');
      }

      // Promise-based API
      if (self._usePromise) {
        return new Promise(function(resolve, reject) {
          var load = self._requests[_declobberedurl];
          if (!load) {
            // load URL then remove from queue
            load = self._requests[_declobberedurl] = self._loader(_declobberedurl)
              .then(function(remoteDoc) {
                delete self._requests[_declobberedurl];
                return remoteDoc;
              }).catch(function(err) {
              delete self._requests[_declobberedurl];
              throw err;
            });
          }
          // resolve/reject promise once URL has been loaded
          load.then(function(remoteDoc) {
            resolve(remoteDoc);
          }).catch(function(err) {
            reject(err);
          });
        });
      }

      // callback-based API
      if (_declobberedurl in self._requests) {
        self._requests[_declobberedurl].push(callback);
      } else {
        self._requests[_declobberedurl] = [callback];
        self._loader(_declobberedurl, function(err, remoteDoc) {
          var callbacks = self._requests[_declobberedurl];
          delete self._requests[_declobberedurl];
          for (var i = 0; i < callbacks.length; ++i) {
            callbacks[i](err, remoteDoc);
          }
        });
      }
    };


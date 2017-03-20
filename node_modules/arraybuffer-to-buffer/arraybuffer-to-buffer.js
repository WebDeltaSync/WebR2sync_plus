(function(root) {
  var isArrayBufferSupported = (new Buffer(new Uint8Array([1]).buffer)[0] === 1);

  var arrayBufferToBuffer = isArrayBufferSupported ? arrayBufferToBufferAsArgument : arrayBufferToBufferCycle;

  function arrayBufferToBufferAsArgument(ab) {
    return new Buffer(ab);
  }

  function arrayBufferToBufferCycle(ab) {
    var buffer = new Buffer(ab.byteLength);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
    }
    return buffer;
  }

  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = arrayBufferToBuffer;
    }
    exports.arrayBufferToBuffer = arrayBufferToBuffer;
  } else if (typeof define === 'function' && define.amd) {
    define([], function() {
      return arrayBufferToBuffer;
    });
  } else {
    root.arrayBufferToBuffer = arrayBufferToBuffer;
  }

})(this);

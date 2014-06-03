function on(obj, listeners) {
  for (var eventName in listeners) {
    obj.addEventListener(eventName, listeners[eventName]);
  }
}

module.exports = function() {
  var fileBuffers = {};

  return function getFileBuffer(file, callback) {
    var container = fileBuffers[file];
    if (container == null) {
      var reader = new FileReader();
      
      container = fileBuffers[file] = {
        referenceCount: 0
      };

      container.bufferPromise = new Promise((resolve, reject) => {
        on(reader, {
          'load': e => {
            var buffer = e.target.result;
            container.buffer = buffer;
            resolve(buffer);
          },
          'abort': reject,
          'error': reject
        });

        //onloadstart
        //onloadend
        //onprogress

        reader.readAsArrayBuffer(file);
      });
    }

    container.referenceCount++;

    container
      .bufferPromise
      .then(
        (buffer) => callback(buffer),
        (error) => console.log('Error reading file', error));

    return () => {
      container.referenceCount--;
      if (container.referenceCount == 0) delete fileBuffers[file];
    };
  };
};
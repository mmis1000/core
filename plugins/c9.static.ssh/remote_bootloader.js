+function(filename, tryEvalScriptCache, global) {
  /**
   * @param {Object} buf
   * @return {?}
   */
  function next(buf) {
    /** @type {number} */
    var matchedPosition = -1;
    /** @type {number} */
    var bytesRead = 0;
    for (;bytesRead < buf.length;bytesRead++) {
      if (0 === buf[bytesRead]) {
        /** @type {number} */
        matchedPosition = bytesRead;
        break;
      }
    }
    if (matchedPosition < 0) {
      return data += buf;
    }
    if (matchedPosition > 0) {
      data += buf.toString("utf8", 0, matchedPosition);
    }
    var line = buf.slice(matchedPosition + 1);
    if (scriptMain) {
      if (!scriptDep) {
        scriptDep = data;
        fs.writeFile(dirname + basename + filename, scriptDep, "utf8", function(err, unknown) {
          fs.readdir(dirname, function(err, files) {
            if (files) {
              files.forEach(function(filename) {
                if (!filename.indexOf(basename)) {
                  if (!(filename == basename + filename)) {
                    fs.unlink(dirname + filename);
                  }
                }
              });
            }
          });
        });
      }
    } else {
      scriptMain = data;
      /** @type {string} */
      data = "";
    }
    if (scriptDep) {
      if (scriptMain) {
        stdin.removeListener("data", next);
        stdout.write("\x00");
        global.eval(scriptDep + scriptMain);
      }
    }
    if (line.length) {
      stdin.emit("data", line);
    }
  }
  var stdin = process.stdin;
  var stdout = process.stdout;
  /** @type {function (this:Console, ...[*]): ?} */
  console.log = console.error;
  /** @type {string} */
  var data = "";
  /** @type {string} */
  var scriptDep = "";
  /** @type {string} */
  var scriptMain = "";
  /** @type {string} */
  var basename = "vfs-cache-";
  /** @type {string} */
  var dirname = process.env.HOME + "/.c9/";
  var fs = require("fs");
  if (global.require = require, tryEvalScriptCache) {
    try {
      global.eval(fs.readFileSync(dirname + basename + filename, "utf8"));
      /** @type {string} */
      scriptDep = "\n";
    } catch (v) {
    }
  }
  if (!scriptDep) {
    stdout.write("\u0001\x00");
  }
  stdin.on("data", next);
  stdin.resume();
}("CACHE_ID", "1", global);
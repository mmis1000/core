"use strict";

main.consumes = ["Plugin", "connect.static"];
main.provides = ["me.mmis1000.ssh.build"];
module.exports = main;

function main(options, imports, register) {
    var Plugin = imports.Plugin;
    var connectStatic = imports["connect.static"];
    
    var os = require("os");
    var fs = require("fs");
    var path = require("path");
    var mkdirp = require("mkdirp");
    var error = require("http-error");
    
    /***** Initialization *****/
    
    var cacheDir = path.resolve(options.cache || os.tmpdir() + "/cdn");
    var config = options.config || "ide";
    var settings = options.settings || "devel";
    var staticsConfig;
    var cache;
    
    var plugin = new Plugin("Mmis1000.me", main.consumes);
    
    /***** Register and define API *****/
    
    function init(callback) {
        fs.readFile(path.join(cacheDir, options.version, 'ssh', 'dep.js'), function(err, content) {
            if (!err && content) {
                cache = content
            }
            callback();
        })
    }
    
    function buildSshRemoteDep(callback) {
        if (cache) {
            console.log('Serve ssh remote file from cache')
            return callback(null, cache)
        }
        var modules = [
            'c9.ide.collab/server/collab-server.js',
            'c9.ide.pubsub/pubsub-service.js',
            'c9.vfs.client/ping-service.js',
            'vfs-socket/worker',
            'smith',
            'msgpack-js',
            'vfs-local',
            'simple-mime',
            './diff_match_patch',
            './slave',
        ];
        
        getStaticsConfig(function(err, config) {
            console.log('config');
            var loadedContents = [];
            
            modules.forEach(function (moduleName) {
                var realPath = "";
                
                try {
                    realPath = require.resolve(moduleName);
                } catch (e) {}
                
                if (!realPath) {
                    realPath = path.resolve(__dirname, '../', moduleName);
                }
                
                console.log('real path is ' + realPath);
                
                var content = fs.readFileSync(realPath);
                
                loadedContents.push({
                    name: moduleName,
                    content: content
                })
            })
            
            var mini_require = fs.readFileSync(path.join(__dirname, 'mini_require.js'))
            
            var result = mini_require + '\r\n'
            
            loadedContents.forEach(function(module) {
                result += "define('" + module.name +"', function (module, exports) {\r\n";
                result += module.content;
                result += "})\r\n";
            })
            
            cache = result;
            mkdirp(path.join(cacheDir, options.version, 'ssh'), function(err) {
                if (err) {
                    callback(err);
                }
                fs.writeFile(path.join(cacheDir, options.version, 'ssh', 'dep.js'), result, function(err) {
                    if (err) {
                        callback(err);
                    }
                    callback(null, result);
                })
            });
        })
    }
    
    function buildSshRemoteMain() {
        
    }
    
    function getStaticsConfig(callback) {
        if (staticsConfig)
            return callback(null, staticsConfig);
        
        tryGetConfig(null, connectStatic);
        
        if (staticsConfig)
            return callback(null, staticsConfig);
        
        var dir = path.join(cacheDir, options.version);
        console.log("Linking static files to ", dir, settings);
        require("../../scripts/makestatic.js")(config, settings, {
            dest: dir + "/static",
            symlink: false,
            compress: options.compress,
            getMounts: !options.link,
            saveRjsConfig: false,
        }, function(err, connectStatic) {
            tryGetConfig(err, connectStatic);
            return callback(err, staticsConfig);
        });
        
        function tryGetConfig(err, connectStatic) {
            if (!connectStatic || options.link)
                return;
            
            var mounts = connectStatic.getMounts();
            var rjsConfig = connectStatic.getRequireJsConfig();
        
            if (!mounts || !mounts[0] || !mounts[0].mount)
                return;
            
            var pathMap = Object.create(null);
            mounts.forEach(function(mount) {
                pathMap[mount.mount] = mount.path;
            });
                
            staticsConfig = {
                pathMap: pathMap,
                rjsConfig: JSON.parse(JSON.stringify(rjsConfig))
            };
        }
    }
    
    function getPathConfig(hash, callback) {
        if (!options.link) {
            getStaticsConfig(function(err, config) {
                if (err) return callback(err);
                
                var pathMap = config.pathMap;
                var pathConfig = config.rjsConfig;
                
                pathConfig.hash = hash;
                pathConfig.root = path.resolve(path.join(__dirname, "../../"));
                var baseUrl = pathConfig.baseUrl || "";
                for (var p in pathConfig.paths) {
                    var url = pathConfig.paths[p];
                    if (typeof url === "string" && url.substring(0, baseUrl.length) == baseUrl)
                        pathConfig.paths[p] = url.substring(baseUrl.length);
                }
                pathConfig.pathMap = pathMap;
                callback(null, pathConfig);
            });
        } else {
            var root = path.resolve(path.join(cacheDir, hash));
            var rjsConfigPath = path.join(root, "/static/requirejs-config.json");
            fs.readFile(rjsConfigPath, "utf8", function(err, pathConfig) {
                if (err) {
                    if (err.code == "ENOENT") 
                        return callback(new error.NotFound());
                    else 
                        return callback(err);
                }
                
                try {
                    pathConfig = JSON.parse(pathConfig);
                } catch (e) {
                    return callback(e);
                }

                pathConfig.root = path.join(root, pathConfig.baseUrl);
                for (var p in pathConfig.paths) {
                    pathConfig.paths[p] = path.join(root, pathConfig.paths[p]);
                }
                callback(null, pathConfig);
            });
        }
    }
    
    /**
     * 
     **/
    plugin.freezePublicAPI({
        buildSshRemoteDep: buildSshRemoteDep,
        buildSshRemoteMain: buildSshRemoteMain,
        get cacheDir() { return cacheDir; },
        get version() { return options.version; }
    });
    
    init(function(err) {
        if (err) return register(err);
        
        console.log("CDN: version " + options.version + " initialized", cacheDir);
        register(null, { "me.mmis1000.ssh.build": plugin });
    });
}

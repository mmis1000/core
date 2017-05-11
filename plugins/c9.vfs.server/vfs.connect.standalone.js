/**
 * Keeps a Cache of VFS instances
 *
 * @copyright 2013, Ajax.org B.V.
 */
define(function(require, exports, module) {
    main.consumes = ["Plugin", "api", "me.mmis1000.ssh.vfs"];
    main.provides = ["vfs.connect"];
    return main;


    function main(options, imports, register) {
        var Plugin = imports.Plugin;
        var api = imports.api;

        var Vfs = require("./vfs");
        var Parent = require('vfs-child').Parent;
        var getSshVfs = imports["me.mmis1000.ssh.vfs"].getSshVfs;
        
        /***** Initialization *****/
        
        var plugin = new Plugin("Ajax.org", main.consumes);
        
        /***** Methods *****/
        
        function connect(user, pid, callback) {
            var projectOptions = api.getVfsOptions
                ? api.getVfsOptions(user, pid)
                : {
                    workspaceDir: options.workspaceDir,
                    extendOptions: options.extendOptions
                };
            
            var vfsOptions = {
                root: "/",
                metapath: "/.c9/metadata",
                wsmetapath: "/.c9/metadata/workspace",
                local: false,
                readOnly: false,
                debug: options.debug,
                homeDir: process.env.HOME,
                projectDir: projectOptions.workspaceDir,
                nakBin: options.nakBin || (process.env.HOME + "/.c9/node_modules/.bin/nak"),
                nodeBin: options.nodeBin,
                tmuxBin: options.tmuxBin
            };
            for (var key in options.vfs)
                vfsOptions[key] = options.vfs[key];
            
            if (!options.sshWorkspace) {
                var master = new Parent(vfsOptions);
                master.connect(function(err, vfs) {
                    if (err) return callback(err);
                    
                    callback(null, new Vfs(vfs, master, {
                        debug: options.debug || false,
                        homeDir: vfsOptions.homeDir,
                        projectDir: vfsOptions.projectDir,
                        extendDirectory: options.extendDirectory,
                        extendOptions: projectOptions.extendOptions,
                        collab: options.collab,
                        vfsOptions: vfsOptions,
                        public: true
                    }));
                });
            } else {
                getSshVfs(vfsOptions, function (err, vfs, transport, remoteVfsOptions) {
                    if (err) return callback(err);
                    
                    callback(null, new Vfs(vfs, transport, {
                        debug: options.debug || false,
                        homeDir: remoteVfsOptions.homeDir,
                        projectDir: remoteVfsOptions.projectDir,
                        extendDirectory: remoteVfsOptions.extendDirectory,
                        extendOptions: projectOptions.extendOptions,
                        collab: options.collab,
                        vfsOptions: remoteVfsOptions,
                        public: true
                    }));
                })
            }
            return function cancel() {};
        }
        
        /***** Register and define API *****/
        
        plugin.freezePublicAPI({
            connect: connect
        });
        
        register(null, {
            "vfs.connect": plugin
        });
    }
});
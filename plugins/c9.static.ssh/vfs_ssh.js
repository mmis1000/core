"use strict";

main.consumes = ["Plugin", "me.mmis1000.ssh.build"];
main.provides = ["me.mmis1000.ssh.vfs"];
module.exports = main;

function main(options, imports, register) {
    var Plugin = imports.Plugin;
    
    var fs = require("fs");
    var ssh = require("c9/ssh");
    var Transport = require("vfs-socket/worker").smith.Transport
    var Consumer = require("vfs-socket/consumer").Consumer
    
    var plugin = new Plugin("Mmis1000.me", main.consumes);
    
    var buildSshRemoteDep = imports["me.mmis1000.ssh.build"].buildSshRemoteDep
    var buildSshRemoteMain = imports["me.mmis1000.ssh.build"].buildSshRemoteMain
    var buildBootloader = imports["me.mmis1000.ssh.build"].buildBootloader
    /*
    buildSshRemoteDep(function (err, content) {
        console.log('content length od dep script is ' + content.length);
    });
    
    buildSshRemoteMain({
        "pingInterval":5000,
        "nodePath":"/root/.c9/node_modules",
        "tmuxBin":"/root/.c9/bin/tmux",
        "root":"/",
        "debug":true,
        "connectionTimeout":60000,
        "sshConnectTimeout":30000,
        "metapath":"/.c9/metadata",
        "wsmetapath":"/.c9/metadata/workspace",
        "projectDir":"/root/",
        "extendApi":{
            "collab":{
                "file":"c9.ide.collab/server/collab-server.js",
                "user":{"uid":479077,"email":"mmis1000@yahoo.com.tw",
                "name":"mmis1000","fullname":"mmis1000"},
                "project":{"pid":4834423,"name":"test-honey"},
                "readonly":false,"nodePath":"/root/.c9/node_modules"
                
            },
            "pubsub":{"file":"c9.ide.pubsub/pubsub-service.js"},
            "ping":{"file":"c9.vfs.client/ping-service.js"}
        },
        "defaultEnv":{
            "HGUSER":"mmis1000",
            "EMAIL":"mmis1000@yahoo.com.tw",
            "EDITOR":"",
            "PORT":"8080",
            "C9_PORT":"8080",
            "IP":"127.0.0.1",
            "C9_HOSTNAME":"home.mmis1000.me",
            "C9_USER":"mmis1000",
            "C9_PROJECT":"test-honey",
            "C9_PID":"4834423"
        }
    }, function (err, content) {
        console.log('content length of main script is ' + content.length);
        console.log(content)
    });
    
    buildBootloader(function(err, content) {
        console.log('content length of bootloader is ' + content.length);
        console.log(content)
    })
    */
    
    function getDefaultOptions() {
        return JSON.parse(JSON.stringify(options.vfsOptions))
    }
    
    function prepare(config, callback) {
        buildSshRemoteDep(function (err, remoteDep) {
            if (err) {
                callback(err);
            }
            buildBootloader(function(err, bootloader) {
                if (err) {
                    callback(err);
                }
                buildSshRemoteMain(config, function(err, remoteMain) {
                    if (err) {
                        callback(err);
                    }
                    callback(null, bootloader, remoteMain, remoteDep);
                })
            })
        })
    }
    
    function getSshVfs(vfsOptions, callback) {
        var newOptions = getDefaultOptions();
        
        for (var key in vfsOptions.defaultEnv) {
            newOptions.defaultEnv[key] =  vfsOptions.defaultEnv[key]
        }
        
        newOptions.projectDir = vfsOptions.projectDir
        
        console.log(newOptions)
        
        fs.appendFileSync("stdout.log", '');
        
        prepare(newOptions, function (err, bootloader, remoteMain, remoteDep) {
            if (err) {
                callback(err);
            }
            var hasCache = null;
            var end = null;
            var child = ssh.spawnWithKeyFile(
                options.keyFile, 
                options.account + '@' + options.host, 
                null, 
                options.nodePath, 
                ['-e', "'" + bootloader + "'"]
            );
            
            child.stdin.on('error', function (err) {
                console.log('stdin ' + err);
            })
            child.stdout.on('error', function (err) {
                console.log('stdout ' + err);
            })
            child.on('error', function (err) {
                console.log('process ' + err);
            })
            child.stdin.write(remoteMain);
            child.stdin.write('\0');
            child.stderr.pipe(process.stderr);
            function nextPhase() {
                try {
                    var data = child.stdout.read(1)
                    if (!data) {
                        return;
                    }
                    process.stdout.write(data)
                    data = data.toString('utf8');
                    fs.appendFileSync("stdout.log", data);
                    
                    if (data === '\u0001') {
                        console.log('missing dep')
                        child.stdout.read(1);
                        child.stdin.write(remoteDep);
                        child.stdin.write('\0');
                    }
                    if (data === '\u0000') {
                        console.log('setup finish booting up vfs')
                        child.stdout.removeListener('readable', nextPhase);
                        startVfs(child, newOptions, callback);
                        return;
                    }
                    process.nextTick(nextPhase);
                } catch (e) {
                    console.log(e);
                    child.stdout.removeListener('readable', nextPhase);
                    callback(e);
                }
            }
            child.stdout.on('readable', nextPhase)
        })
    }
    
    function startVfs(sshProcess, vfsOptions, callback) {
        var consumer = new Consumer()
        
        var transport = new Transport([sshProcess.stdout, sshProcess.stdin])
        
        consumer.connect(transport, function (err, remote) {
          if (err) return callback(err);
          var vfs = require('vfs-lint')(remote);
          
          callback(null, vfs, transport, vfsOptions);
        });
    }
    
    plugin.freezePublicAPI({
        getSshVfs: getSshVfs
    });
    
    register(null, { "me.mmis1000.ssh.vfs": plugin });
}
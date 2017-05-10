"use strict";

main.consumes = ["Plugin", "me.mmis1000.ssh.build"];
main.provides = ["me.mmis1000.ssh.vfs"];
module.exports = main;

function main(options, imports, register) {
    var Plugin = imports.Plugin;
    
    var plugin = new Plugin("Mmis1000.me", main.consumes);
    
    var buildSshRemoteDep = imports["me.mmis1000.ssh.build"].buildSshRemoteDep
    var buildSshRemoteMain = imports["me.mmis1000.ssh.build"].buildSshRemoteMain
    
    buildSshRemoteDep(function (err, content) {
        console.log('content length is ' + content.length)
    });
    
    buildSshRemoteDep(function (err, content) {
        console.log('content length is ' + content.length)
    });
    
    function getSshVfs() {
        
    }
    
    plugin.freezePublicAPI({
        getSshVfs: getSshVfs
    });
    
    register(null, { "me.mmis1000.ssh.vfs": plugin });
}
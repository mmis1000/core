module.exports = function (config, callback) {

    process.title = "vfs-worker " + JSON.stringify(config);
    var Worker = require('vfs-socket/worker').Worker;
    var vfsLocal = require('vfs-local')(config);
    
    var worker = new Worker(vfsLocal);
    worker.connect([process.stdin, process.stdout], callback);
    worker.on("disconnect", function () {
        process.removeListener("SIGINT", intHandler);
        process.removeListener("SIGTERM", termHandler);
        process.removeListener("uncaughtException", exceptionHandler);
        
        vfsLocal.killtree(process.pid, {}, function(err, pidlist){
            if (err) {
                console.error(err.stack);
                process.exit();
            }
        });
    });

    process.on("SIGINT", intHandler);
    process.on("SIGTERM", termHandler);
    process.on("uncaughtException", exceptionHandler);

    function intHandler() {
        cleanup(new Error("Received unexpected signal: SIGINT"), 1);
    }
    function termHandler() {
        cleanup(new Error("Received unexpected signal: SIGTERM"), 2);
    }
    function exceptionHandler(err) {
        cleanup(err, 3);
    }
    
    function cleanup(err, code) {
        console.log(process.pid, "Unhandled exception", (err.message || err).toString(), err.stack);
        
        // give some time to send last packages
        setTimeout(function() {
            worker.disconnect(err);
            
            // give some time to close connection
            setTimeout(function() {
                process.exit(code);
            }, 500);
        }, 200);
    }
};
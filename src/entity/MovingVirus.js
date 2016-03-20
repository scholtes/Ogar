var Virus = require('./Virus')

function MovingVirus() {
    Virus.apply(this, Array.prototype.slice.call(arguments));

    this.color = {
        r: 104 + Math.floor(48*Math.random()),
        g: 0,
        b: 40 + Math.floor(48*Math.random())
    };
    this.angle = 3.14*Math.random();
    this.setMoveEngineData(2+4*Math.random(), Infinity, 1);
}

module.exports = MovingVirus;
MovingVirus.prototype = new Virus();


// Unlike original viruses, these don't grow and split.  They move
MovingVirus.prototype.feed = function(feeder, gameServer) {
    // Just a bunch of inelastic collision (momentum) equations
    var m1 = feeder.mass * 0.25; // * 0.25 because it gets a little crazy otherwise
    var m2 = this.mass;
    var v1 = feeder.moveEngineSpeed;
    var v2 = this.moveEngineSpeed;
    var theta1 = feeder.angle;
    var theta2 = this.angle;

    var px = m1*v1*Math.cos(theta1) + m2*v2*Math.cos(theta2);
    var py = m1*v1*Math.sin(theta1) + m2*v2*Math.sin(theta2);

    this.angle = Math.atan2(py, px);
    var newSpeed = Math.sqrt(px*px + py*py)/m2; 

    this.setMoveEngineData(newSpeed, Infinity, 1);

    // Remove the feeder
    gameServer.removeNode(feeder);
}

MovingVirus.prototype.calcMovePhys = function(config) {
    // Movement for ejected cells
    var X = this.position.x + ( this.moveEngineSpeed * Math.sin(this.angle) );
    var Y = this.position.y + ( this.moveEngineSpeed * Math.cos(this.angle) );

    // Movement engine
    this.moveEngineSpeed *= this.moveDecay; // Decaying speed
    this.moveEngineTicks--;

    // Border check - Bouncy physics
    var radius = 40;
    if ((this.position.x - radius) < config.borderLeft) {
        // Flip angle horizontally - Left side
        this.angle = 6.28 - this.angle;
        X = config.borderLeft + radius;
    }
    if ((this.position.x + radius) > config.borderRight) {
        // Flip angle horizontally - Right side
        this.angle = 6.28 - this.angle;
        X = config.borderRight - radius;
    }
    if ((this.position.y - radius) < config.borderTop) {
        // Flip angle vertically - Top side
        this.angle = (this.angle <= 3.14) ? 3.14 - this.angle : 9.42 - this.angle;
        Y = config.borderTop + radius;
    }
    if ((this.position.y + radius) > config.borderBottom) {
        // Flip angle vertically - Bottom side
        this.angle = (this.angle <= 3.14) ? 3.14 - this.angle : 9.42 - this.angle;
        Y = config.borderBottom - radius;
    }

    // Set position
    this.position.x = X >> 0;
    this.position.y = Y >> 0;
};

MovingVirus.prototype.onAdd = function(gameServer) {
    gameServer.gameMode.movingVirusCount++;
    gameServer.nodesVirus.push(this);
}

MovingVirus.prototype.onRemove = function(gameServer) {
    gameServer.gameMode.movingVirusCount--;

    index = gameServer.nodesVirus.indexOf(this);
    if (index != -1) {
        gameServer.nodesVirus.splice(index, 1);
    } else {
        console.log("[Warning] Tried to remove a non existing virus!");
    }

}
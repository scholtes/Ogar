var Experimental = require('./Experimental'); // Hijacking some of those features
var Virus = require('../entity/Virus');
var PlayerCell = require('../entity/PlayerCell');
var Cell = require('../entity/Cell');

function Juggernaut() {
    Experimental.apply(this, Array.prototype.slice.call(arguments));

    this.ID = 30;
    this.name = "Juggernaut";
    this.specByLeaderboard = true;
}

module.exports = Juggernaut;
Juggernaut.prototype = new Experimental();

Juggernaut.prototype.onServerInit = function(gameServer) {
    Experimental.prototype.onServerInit.call(this, gameServer);

    Virus.prototype.virusFeedAmount = null;

    Virus.prototype.feed = function(feeder, gameServer) {
        if (Math.random() < gameServer.config.virusBackfireProbability) {
            feeder.angle = feeder.getAngle() + 3.14;
        }

        if (this.moveEngineTicks == 0) this.setAngle(feeder.getAngle()); // Set direction if the virus explodes
        this.mass += feeder.mass;
        this.fed++; // Increase feed count
        gameServer.removeNode(feeder);

        // Check if the virus is going to explode
        if (this.fed >= this.getVirusFeedAmount(gameServer)) {
            var baseAngle = feeder.getAngle();
            this.mass = gameServer.config.virusStartMass; // Reset mass
            this.virusFeedAmount = null; // Forces feed amount for THIS virus to change
            this.fed = 0;
            
            // Figure out how many new viruses to create
            var denominator = 1.0;
            var numNewVirus = 1;
            for (var i = 0; i < gameServer.config.virusSplitNoProb.length-1; i++) {
                if (Math.random() < gameServer.config.virusSplitNoProb[i]/denominator) {
                    break;
                }
                numNewVirus++;
                denominator -= gameServer.config.virusSplitNoProb[i];
            }

            // Now we can create the new viruses (with quanitty numNewVirus)
            var angleOffset = -0.5*gameServer.config.virusSpreadAngle*(numNewVirus-1);
            for (i = 0; i < numNewVirus; i++) {
                this.setAngle(baseAngle + angleOffset);
                gameServer.shootVirus(this);
                angleOffset += gameServer.config.virusSpreadAngle;
            }
        }
    };

    Virus.prototype.getVirusFeedAmount = function(gameServer) {
        if(this.virusFeedAmount === null) {
            this.virusFeedAmount = Math.floor(
                    gameServer.config.virusMinFeedAmount
                    + Math.random()*(
                    gameServer.config.virusMaxFeedAmount
                    - gameServer.config.virusMinFeedAmount
                    + 1
                    )
            );
        }
        return this.virusFeedAmount;
    };

    PlayerCell.prototype.onAutoMove = function(gameServer) {
        if (this.owner.cells.length == 2) {
            // Check for viruses
            var v = gameServer.getNearestVirus(this);
            // Swap with virus if it exists
            // +1 to avoid swapping when the cell is just
            // barely larger than the virus (looks unnatural)
            // This is not necessary, but looks nicer on the client
            if (v && v.mass > this.mass+1) {
                var thisAngle = this.getAngle();
                v.setAngle(thisAngle+3.14);
                v.setMoveEngineData(85,20,0.85);

                // Move the player's other cell
                // For loop just to avoid conditions
                // where the other cell might be inaccessable
                for(var i = 0; i < this.owner.cells.length; i++) {
                    this.owner.cells[i].setAngle(thisAngle);
                    this.owner.cells[i].setMoveEngineData(85,20,0.85);
                    gameServer.setAsMovingNode(this.owner.cells[i]);
                }

                gameServer.setAsMovingNode(v);
                gameServer.removeNode(this);
                return true;
            }
        }
    };

    PlayerCell.prototype.calcMovePhys = function(config) {
        Cell.prototype.calcMovePhys.call(this, config);
        if (this.moveEngineTicks > 0) {
            this.onAutoMove(this.gameServer);
        }
    };

}
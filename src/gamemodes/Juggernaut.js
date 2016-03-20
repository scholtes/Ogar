var Experimental = require('./Experimental'); // Hijacking some of those features
var Virus = require('../entity/Virus');

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
        if (this.moveEngineTicks == 0) this.setAngle(feeder.getAngle()); // Set direction if the virus explodes
        this.mass += feeder.mass;
        this.fed++; // Increase feed count
        gameServer.removeNode(feeder);

        // Check if the virus is going to explode
        if (this.fed >= this.getVirusFeedAmount(gameServer)) {
            this.mass = gameServer.config.virusStartMass; // Reset mass
            this.virusFeedAmount = null; // Forces feed amount for THIS virus to change
            this.fed = 0;
            gameServer.shootVirus(this);
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

}
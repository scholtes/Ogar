var Experimental = require('./Experimental'); // Hijacking some of those features
var Virus = require('../entity/Virus');
var PlayerCell = require('../entity/PlayerCell');
var Cell = require('../entity/Cell');
var MovingVirus = require('../entity/MovingVirus');
var StickyCell = require('../entity/StickyCell');
var Beacon = require('../entity/Beacon');
var EjectedMass = require('../entity/EjectedMass');

function Juggernaut() {
    Experimental.apply(this, Array.prototype.slice.call(arguments));

    this.ID = 30;
    this.name = "Juggernaut";
    this.specByLeaderboard = true;

    this.movingVirusCount = 0;
    this.nodesSticky = [];
}

module.exports = Juggernaut;
Juggernaut.prototype = new Experimental();

Juggernaut.prototype.onServerInit = function(gameServer) {
    Experimental.prototype.onServerInit.call(this, gameServer);
    var PlayerTracker = require('../PlayerTracker');
    var Commands = require('../modules/CommandList');

    var oldHelp = Commands.list.help;
    Commands.list.help = function(gameServer, split) {
        oldHelp.call(gameServer, split);
        console.log("[Console] juggernaut : set or view player's juggernautness");
        console.log("[Console] kickname   : kick all players matching name");
        console.log("[Console] killname   : kill all players matching name");
        console.log("[Console] ====================================================");
    };

    Commands.list.kickname = function(gameServer, split) {
        var name = split[1];
        if (!name) {
            console.log("[Console] Please specify a player name!");
            return;
        }
        name = name.toLowerCase();

        console.log("[Console] Removing players '" + name + "'");

        var count = 0;
        for (var i in gameServer.clients) {
            var ithName = gameServer.clients[i].playerTracker.name.toLowerCase().replace(/\s/g, '');
            if (ithName == name || (name == "-" && ithName == '')) {
                var client = gameServer.clients[i].playerTracker;
                var len = client.cells.length;
                for (var j = 0; j < len; j++) {
                    gameServer.removeNode(client.cells[0]);
                }
                client.socket.close();
                count++;
            }
        }

        console.log("[Console] Kicked " + count + " players");
    };

    Commands.list.killname = function(gameServer,split) {
        var name = split[1];
        if (!name) {
            console.log("[Console] Please specify a player name!");
            return;
        }
        name = name.toLowerCase();

        console.log("[Console] Removing players '" + name + "'");

        var count = 0;
        for (var i in gameServer.clients) {
            var ithName = gameServer.clients[i].playerTracker.name.toLowerCase().replace(/\s/g, '');
            if (ithName == name || (name == "-" && ithName == '')) {
                var client = gameServer.clients[i].playerTracker;
                var len = client.cells.length;
                for (var j = 0; j < len; j++) {
                    gameServer.removeNode(client.cells[0]);
                }
                count++;
            }
        }

        console.log("[Console] Killed " + count + " players");
    };

    Commands.list.juggernaut = function(gameServer,split) {
        // Validation checks
        var id = parseInt(split[1]);
        if (isNaN(id)) {
            console.log("[Console] Please specify a valid player ID!");
            console.log("[Console] key : " + gameServer.juggernautID);
            return;
        }

        // Get player
        var client;
        for (var i in gameServer.clients) {
            if (gameServer.clients[i].playerTracker.pID == id) {
                client = gameServer.clients[i].playerTracker;
                break;
            }
        }

        if(client) {
            if(split.length == 2) {
                // tell if juggernaut
                console.log("[Console] " + client.juggernaut);
            } else if(split.length >= 2) {
                var makeJugg = (split[2] === 'true');
                if(makeJugg) {
                    client.makeJuggernaut();
                    console.log("[Console] Player " + id + " made juggernaut");
                } else {
                    client.makeNotJuggernaut();
                    console.log("[Console] Player " + id + " made non-juggernaut");
                }
            }
        } else {
            console.log("[Console] No player with that ID!");
        }
    };

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

    var oldVirusOnConsume = Virus.prototype.onConsume;
    Virus.prototype.onConsume = function(consumer, gameServer) {
        var oldIDs = consumer.owner.cells.map(function(cell){return cell.nodeId});
        if(consumer.owner.juggernaut) {
            consumer.owner.makeNotJuggernaut();
        }
        oldVirusOnConsume.call(this, consumer, gameServer);
        // Do color stuff
        for (var i = 0; i < consumer.owner.cells.length; i++) {
            if (oldIDs.indexOf(consumer.owner.cells[i].nodeId) < 0) {
                var split = consumer.owner.cells[i];
                split.color.r += Math.floor(48*Math.random()) - 24;
                split.color.g += Math.floor(48*Math.random()) - 24;
                split.color.b += Math.floor(48*Math.random()) - 24;

                if(split.color.r < 0) { split.color.r = 0; }
                if(split.color.g < 0) { split.color.g = 0; }
                if(split.color.b < 0) { split.color.b = 0; }

                if(split.color.r > 255) { split.color.r = 255; }
                if(split.color.g > 255) { split.color.g = 255; }
                if(split.color.b > 255) { split.color.b = 255; }
            }
        }
    };

    PlayerCell.prototype.onAutoMove = function(gameServer) {
        this.juggernautable = false;
        if (this.owner.cells.length == 2) {
            // Check for viruses
            var v = gameServer.getNearestVirus(this);
            // Swap with virus if it exists
            // +1 to avoid swapping when the cell is just
            // barely larger than the virus (looks unnatural)
            // This is not necessary, but looks nicer on the client
            if (v && v.mass > this.mass+1 && v.moveEngineTicks === 0) {
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
        } else if (!this.juggernautable) {
            this.juggernautable = true;
        }
    };

    PlayerCell.prototype.juggernautable = true;

    var oldPlayerCellOnConsume = PlayerCell.prototype.onConsume;
    PlayerCell.prototype.onConsume = function(consumer, gameServer) {
        var thisOwnerWasJuggernaut = this.owner.juggernaut;
        this.owner.makeNotJuggernaut();
        if (thisOwnerWasJuggernaut && consumer.juggernautable) {
            consumer.addMass(-2*this.mass);
            if (consumer.mass < 10) {
                consumer.mass = 10;
            }
            Virus.prototype.onConsume.call(this, consumer, gameServer);
            // Times 2 because Virus.prot.onConsume adds the mass first
        } else {
            oldPlayerCellOnConsume.call(this, consumer, gameServer);
        }
    };

    gameServer.hasJuggernaut = false;

    var oldSplitCells = Object.getPrototypeOf(gameServer).splitCells;
    Object.getPrototypeOf(gameServer).splitCells = function(client) {
        var oldIDs = client.cells.map(function(cell){return cell.nodeId});
        if (client.juggernaut) {
            return;
        }
        oldSplitCells.call(this, client);
        for (var i = 0; i < client.cells.length; i++) {
            if (oldIDs.indexOf(client.cells[i].nodeId) < 0) {
                // Slightly randomize color (formulated to stay in 0 - 255)
                var split = client.cells[i];
                split.color.r += Math.floor(48*Math.random()) - 24;
                split.color.g += Math.floor(48*Math.random()) - 24;
                split.color.b += Math.floor(48*Math.random()) - 24;

                if(split.color.r < 0) { split.color.r = 0; }
                if(split.color.g < 0) { split.color.g = 0; }
                if(split.color.b < 0) { split.color.b = 0; }

                if(split.color.r > 255) { split.color.r = 255; }
                if(split.color.g > 255) { split.color.g = 255; }
                if(split.color.b > 255) { split.color.b = 255; }
            }
        }
    };

    var oldSpawnPlayer = Object.getPrototypeOf(gameServer).spawnPlayer;
    Object.getPrototypeOf(gameServer).spawnPlayer = function(player, pos, mass) {
        oldSpawnPlayer.call(this, player, pos, mass);

        // Make juggernaut if they have the key
        if (player.name === this.juggernautID) {
            player.makeJuggernaut();
            this.juggernautID = this.makeID();
            console.log("[Console] New juggernaut key: " + this.juggernautID);
        }

        // Make juggernaut if there is no juggernaut in play (except admin)
        // The randomness is so that a player who dies and immediately
        // rejoins isn't stuck as juggernaut forever. The constant
        // is arbitrary
        if(Math.random() < 0.333 && !this.hasJuggernaut) {
            player.makeJuggernaut();
        }
    };

    Object.getPrototypeOf(gameServer).makeID = function() {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for(var i = 0; i < 8; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        return text;
    };

    gameServer.juggernautID = gameServer.makeID();

    PlayerTracker.prototype.juggernaut = false;
    PlayerTracker.prototype.oldName = "";

    PlayerTracker.prototype.setName = function(name) {
        this.name = name;
        this.oldName = name;
    };

    PlayerTracker.prototype.makeJuggernaut = function() {
        this.juggernaut = true;
        this.gameServer.hasJuggernaut = true;
        this.oldName = this.name;
        this.name = "";
        var color = {
            r: 104 + Math.floor(48*Math.random()),
            g: 0,
            b: 40 + Math.floor(48*Math.random())
        };
        this.setColor(color);
        for(var i = 0; i < this.cells.length; i++) {
            this.cells[i].spiked = 1;
            this.cells[i].color = color;
        }
    };

    PlayerTracker.prototype.makeNotJuggernaut = function() {
        if (this.juggernaut) {
            this.juggernaut = false;
            this.gameServer.hasJuggernaut = false;
            this.name = this.oldName;
            for(var i = 0; i < this.cells.length; i++) {
                this.cells[i].spiked = 0;
            }
        }
    }; 

    var oldPlayerTrackerUpdate = PlayerTracker.prototype.update;
    PlayerTracker.prototype.update = function() {
        if (this.disconnect === 0) {
            this.makeNotJuggernaut();
        }
        oldPlayerTrackerUpdate.call(this);
    };

    // TODO: if Mother Cell is put in its own file, redo the logic below
    // Make sure the juggernaut is removed no matter what (e.g., mother cell)
    var oldRemoveNode = Object.getPrototypeOf(gameServer).removeNode;
    Object.getPrototypeOf(gameServer).removeNode = function(check) {
        if(check.cellType === 0 && check.owner.juggernaut) {
            check.owner.makeNotJuggernaut();
        }
        oldRemoveNode.call(this, check);
    };

    var oldEjectedAutoMove = EjectedMass.prototype.onAutoMove;
    EjectedMass.prototype.onAutoMove = function(gameServer) {
        var beacon = gameServer.gameMode.beacon;
        if (beacon && this.collisionCheck2(beacon.getSquareSize(), beacon.position)) {
            beacon.feed(this, gameServer);
            return true;
        }
        return oldEjectedAutoMove.call(this, gameServer);
    };
};

Juggernaut.prototype.spawnMovingVirus = function(gameServer) {
    // Checks if there are enough moving viruses on the map
    if (this.movingVirusCount < gameServer.config.movingVirusMinAmount) {
        // Spawns a mother cell
        var pos = gameServer.getRandomPosition();

        // Check for players
        for (var i = 0; i < gameServer.nodesPlayer.length; i++) {
            var check = gameServer.nodesPlayer[i];

            var r = check.getSize(); // Radius of checking player cell

            // Collision box
            var topY = check.position.y - r;
            var bottomY = check.position.y + r;
            var leftX = check.position.x - r;
            var rightX = check.position.x + r;

            // Check for collisions
            if (pos.y > bottomY) {
                continue;
            }

            if (pos.y < topY) {
                continue;
            }

            if (pos.x > rightX) {
                continue;
            }

            if (pos.x < leftX) {
                continue;
            }

            // Collided
            return;
        }

        // Spawn if no cells are colliding
        var m = new MovingVirus(
                gameServer.getNextNodeId(),
                null,
                pos,
                gameServer.config.movingVirusMass + Math.floor(50*Math.random())
        );
        gameServer.movingNodes.push(m);
        gameServer.addNode(m);
    }
};

Juggernaut.prototype.spawnStickyCell = function(gameServer) {
    // Checks if there are enough moving viruses on the map
    if (this.nodesSticky.length < gameServer.config.stickyMinAmount) {
        // Spawns a mother cell
        var pos = gameServer.getRandomPosition();

        // Check for players
        for (var i = 0; i < gameServer.nodesPlayer.length; i++) {
            var check = gameServer.nodesPlayer[i];

            var r = check.getSize(); // Radius of checking player cell

            // Collision box
            var topY = check.position.y - r;
            var bottomY = check.position.y + r;
            var leftX = check.position.x - r;
            var rightX = check.position.x + r;

            // Check for collisions
            if (pos.y > bottomY) {
                continue;
            }

            if (pos.y < topY) {
                continue;
            }

            if (pos.x > rightX) {
                continue;
            }

            if (pos.x < leftX) {
                continue;
            }

            // Collided
            return;
        }

        // Spawn if no cells are colliding
        var m = new StickyCell(
                gameServer.getNextNodeId(),
                null,
                pos,
                gameServer.config.stickyMass
        );
        gameServer.addNode(m);
    }
};

Juggernaut.prototype.updateStickyCells = function(gameServer) {
    for (var i in this.nodesSticky) {
        var sticky = this.nodesSticky[i];
        sticky.update(gameServer);
    }
};

Juggernaut.prototype.updateMotherCells = function(gameServer) {
    for (var i in this.nodesMother) {
        var mother = this.nodesMother[i];

        // Checks
        mother.update(gameServer);
        mother.checkEat(gameServer);

        // TODO: move the following checks into monkey-patch of
        // MotherCell.prototype.update if/when MotherCell is moved
        if (mother.mass > gameServer.config.motherCellMaxMass) {
            mother.mass = gameServer.config.motherCellMaxMass;
            // Spit out a virus if there aren't too many
            if(gameServer.nodesVirus.length < gameServer.config.virusMaxAmount) {
                mother.setAngle(Math.random() * 6.28);
                this.shootVirus(mother, gameServer);
                mother.mass -= gameServer.config.virusStartMass;
            }
        }
    }
};

Juggernaut.prototype.shootVirus = function(parent, gameServer) {
    // Unlike gameServer, we must start outside or the mother cell will eat it
    parentRadius = 0.5*parent.getSize();
    var parentPos = {
        x: parent.position.x + Math.sin(parent.angle)*parentRadius,
        y: parent.position.y + Math.cos(parent.angle)*parentRadius
    };

    var newVirus = new Virus(gameServer.getNextNodeId(), null, parentPos, gameServer.config.virusStartMass, gameServer);
    newVirus.setAngle(parent.getAngle());
    newVirus.setMoveEngineData(135, 20, 0.85);

    // Add to moving cells list
    gameServer.addNode(newVirus);
    gameServer.setAsMovingNode(newVirus);
};

Juggernaut.prototype.onTick = function(gameServer) {
    // Create a beacon if one doesn't exist
    if(!this.beacon) {
        this.beacon = new Beacon(
                gameServer.getNextNodeId(),
                null,
                gameServer.getRandomPosition(),
                gameServer.config.beaconMass
        );
        gameServer.addNode(this.beacon);
    }

    // Mother Cell updates
    this.updateMotherCells(gameServer);
    this.updateStickyCells(gameServer);

    // Mother Cell and MovingVirus Spawning
    if (this.tickMotherS >= this.motherSpawnInterval) {
        this.spawnMotherCell(gameServer);
        this.spawnMovingVirus(gameServer);
        this.spawnStickyCell(gameServer);
        this.tickMotherS = 0;
    } else {
        this.tickMotherS++;
    }
};
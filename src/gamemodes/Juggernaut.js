var Experimental = require('./Experimental'); // Hijacking some of those features

function Juggernaut() {
    Experimental.apply(this, Array.prototype.slice.call(arguments));

    this.ID = 30;
    this.name = "Juggernaut";
    this.specByLeaderboard = true;
}

module.exports = Juggernaut;
Juggernaut.prototype = new Experimental();

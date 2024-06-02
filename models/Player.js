const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
  Player: String,
  Team: String,
  Role: String, // BATTER, BOWLER, ALL-ROUNDER, WICKETKEEPER
});

const Player = mongoose.model("Player", playerSchema);
module.exports = Player;

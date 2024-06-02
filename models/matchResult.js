const mongoose = require("mongoose");

const matchResultSchema = new mongoose.Schema({
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
  runs: Number,
  boundaries: Number,
  sixes: Number,
  wickets: Number,
  lbwBowled: Number,
  maidenOvers: Number,
  catches: Number,
  stumpings: Number,
  runOuts: Number,
});

const MatchResult = mongoose.model("MatchResult", matchResultSchema);
module.exports = MatchResult;

const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
  teamName: { type: String, required: true },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player" }],
  captain: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Player",
    required: true,
  },
  viceCaptain: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Player",
    required: true,
  },
  totalPoints: { type: Number, default: 0 },
});

const Team = mongoose.model("Team", teamSchema);
module.exports = Team;

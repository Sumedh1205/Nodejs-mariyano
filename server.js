require("dotenv").config();
const express = require("express");
const connectDB = require("./.config/db"); // Import the MongoDB connection
const Player = require("./models/Player");
const Team = require("./models/Team");
const MatchResult = require("./models/MatchResult");
const fs = require("fs");
const path = require("path");
const { count } = require("console");

const app = express();
const port = 3000;

app.use(express.json());

// Connect to MongoDB
connectDB();

// Endpoints

app.get("/", async (req, res) => {
  res.send("Hello World!");
});

// Add Team Entry
app.post("/add-team", async (req, res) => {
  const { teamName, players, captain, viceCaptain } = req.body;

  if (
    !teamName ||
    !players ||
    players.length !== 11 ||
    !captain ||
    !viceCaptain
  ) {
    return res.status(400).send({ status: 0, message: "Invalid input" });
  }

  // Validate player selection rules
  const playerDocs = await Player.find({ Player: { $in: players } });
  if (playerDocs.length !== 11) {
    return res
      .status(400)
      .send({ status: 0, message: "players are less than 11 " });
  }

  const teamCounts = playerDocs.reduce((acc, player) => {
    acc[player.Team] = (acc[player.Team] || 0) + 1;
    return acc;
  }, {});

  if (Object.values(teamCounts).some((count) => count > 10)) {
    return res.status(400).send({
      status: 0,
      message: "Max 10 players from one team allowed" + count,
    });
  }

  const roles = { WK: 0, BAT: 0, AR: 0, BWL: 0 };
  playerDocs.forEach((player) => {
    if (player.Role.includes("WICKETKEEPER")) roles.WK++;
    if (player.Role.includes("BATTER")) roles.BAT++;
    if (player.Role.includes("ALL-ROUNDER")) roles.AR++;
    if (player.Role.includes("BOWLER")) roles.BWL++;
  });

  if (roles.WK < 1 || roles.BAT < 1 || roles.AR < 1 || roles.BWL < 1) {
    return res
      .status(400)
      .send({ status: 0, message: "Invalid role distribution" });
  }

  // Check captain and vice-captain
  const captainDoc = playerDocs.find((player) => player.Player === captain);
  const viceCaptainDoc = playerDocs.find(
    (player) => player.Player === viceCaptain
  );

  if (!captainDoc || !viceCaptainDoc) {
    return res
      .status(400)
      .send({ status: 0, message: "Invalid captain or vice-captain" });
  }

  const team = new Team({
    teamName,
    players: playerDocs.map((player) => player._id),
    captain: captainDoc._id,
    viceCaptain: viceCaptainDoc._id,
  });

  await team.save();
  res.send({ status: 1, message: "Team added successfully" });
});


// Process Match Result
app.post("/process-result", async (req, res) => {
  const matchDataPath = path.join(__dirname, "data/match.json");
  const matchData = JSON.parse(fs.readFileSync(matchDataPath, "utf-8"));

  const playerScores = {};

  matchData.forEach((ball) => {
    const {
      batter,
      bowler,
      batsman_run,
      isWicketDelivery,
      kind,
      fielders_involved,
    } = ball;

    if (!playerScores[batter]) playerScores[batter] = { runs: 0, boundaries: 0, sixes: 0, ducks: 0 };
    if (!playerScores[bowler]) playerScores[bowler] = { wickets: 0, lbwBowled: 0, maidenOvers: 0 };

    const fielders = Array.isArray(fielders_involved) ? fielders_involved : [fielders_involved];
    fielders.forEach((fielder) => {
      if (!playerScores[fielder]) playerScores[fielder] = { catches: 0, stumpings: 0, runOuts: 0 };
    });

    // Update batting statistics
    playerScores[batter].runs += batsman_run;
    if (batsman_run === 4) playerScores[batter].boundaries++;
    if (batsman_run === 6) playerScores[batter].sixes++;

    // Update bowling statistics
    if (isWicketDelivery) {
      playerScores[bowler].wickets++;
      if (kind === "lbw" || kind === "bowled") playerScores[bowler].lbwBowled++;
    }

    // Update fielding statistics
    if (isWicketDelivery) {
      if (kind === "caught") fielders.forEach((fielder) => playerScores[fielder].catches++);
      if (kind === "stumped") fielders.forEach((fielder) => playerScores[fielder].stumpings++);
      if (kind === "run out") fielders.forEach((fielder) => playerScores[fielder].runOuts++);
    }
  });

  // Save match results for each player
  for (const playerName in playerScores) {
    const player = await Player.findOne({ name: playerName });

    if (player) {
      const matchResult = new MatchResult({
        playerId: player._id,
        ...playerScores[playerName],
      });
      await matchResult.save();
    }
  }

  // Calculate total points for each team
  const teams = await Team.find()
    .populate("players")
    .populate("captain")
    .populate("viceCaptain");

  for (const team of teams) {
    let totalPoints = 0;
    for (const player of team.players) {
      const matchResult = await MatchResult.findOne({ playerId: player._id });
      if (matchResult) {
        let points =
          matchResult.runs +
          matchResult.boundaries +
          2 * matchResult.sixes +
          (matchResult.runs >= 30 ? 4 : 0) +
          (matchResult.runs >= 50 ? 8 : 0) +
          (matchResult.runs >= 100 ? 16 : 0) +
          (["BATTER", "WICKETKEEPER", "ALL-ROUNDER"].includes(player.Role) && matchResult.runs === 0 ? -2 : 0) +
          25 * matchResult.wickets +
          8 * matchResult.lbwBowled +
          (matchResult.wickets >= 3 ? 4 : 0) +
          (matchResult.wickets >= 4 ? 8 : 0) +
          (matchResult.wickets >= 5 ? 16 : 0) +
          12 * matchResult.maidenOvers +
          8 * matchResult.catches +
          (matchResult.catches >= 3 ? 4 : 0) +
          12 * matchResult.stumpings +
          6 * matchResult.runOuts;

        if (player._id.equals(team.captain._id)) {
          points *= 2;
        } else if (player._id.equals(team.viceCaptain._id)) {
          points *= 1.5;
        }

        totalPoints += points;
      }
    }
    team.totalPoints = totalPoints;
    await team.save();
  }

  res.send({ status: 1, message: "Results processed successfully", });
});

// View Teams Results
app.get("/team-result", async (req, res) => {
  const teams = await Team.find()
    .sort({ totalPoints: -1 })
    .populate("players")
    .populate("captain")
    .populate("viceCaptain");

  const topScore = teams.length > 0 ? teams[0].totalPoints : 0;
  const winners = teams.filter((team) => team.totalPoints === topScore);

  res.send(winners);
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
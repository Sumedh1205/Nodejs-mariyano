require("dotenv").config();
const mongoose = require("mongoose");
const Player = require("./models/Player");
const fs = require("fs");
const path = require("path");
const connectDB = require("./.config/db"); // Adjust the path as needed

const loadPlayers = async () => {
  try {
    await connectDB();

    // Read player.json file
    const dataPath = path.join(__dirname, "data", "players.json");
    const playersData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

    // Clear existing players
    await Player.deleteMany();

    // Insert new players
    await Player.insertMany(playersData);

    console.log("Players loaded successfully");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

loadPlayers();

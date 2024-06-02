require("dotenv").config();
const mongoose = require("mongoose");

// const DB_USER = process.env.DB_USER;
// const DB_PWD = process.env.DB_PWD;
// const DB_URL = process.env.DB_URL;
// const DB_NAME = "task-";

const uri = `mongodb://localhost:27017/task-`;

const connectDB = async () => {
  try {
    await mongoose.connect(uri, {
    });
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Error connecting to MongoDB", err);
    process.exit(1);
  }
};

module.exports = connectDB;

import express from 'express';
import chalk from 'chalk';
import dotenv from 'dotenv';
import {MongoClient} from "mongodb"


const app = express();
dotenv.config();

let db = null;
const mongoClient = new MongoClient(process.env.Mongo_URI);
const promise = mongoClient.connect();
promise.then(() => {
    db = mongoClient.db(process.env.DATABASE);
    console.log(chalk.green.bold("Database connection estabilished"));
});
promise.catch((e) => console.log("Database connection error! ", e));



const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(chalk.green("Server successfully connected!"));
});
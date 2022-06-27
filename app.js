import express, {json} from 'express';
import cors from 'cors';
import dayjs from 'dayjs';
import joi from 'joi';
import chalk from 'chalk';
import dotenv from 'dotenv';
import {MongoClient} from "mongodb";


const app = express();
app.use(json(), cors());
dotenv.config();

let db = null;
const mongoClient = new MongoClient(process.env.Mongo_URI);
const promise = mongoClient.connect();
promise.then(() => {
    db = mongoClient.db(process.env.DATABASE);
    console.log(chalk.green.bold("Database connection estabilished"));
});
promise.catch((e) => console.log("Database connection error! ", e));

app.post('/participants', async (req,res) => {
    const participant = req.body; 
    const participantSchema = joi.object({name: joi.string().required()});
    const {error} = participantSchema.validate(participant); 

    if (error) {
        return res.sendStatus(422);
    }
    
    try {
        const participantExists = await db.collection("participants").findOne({name: participant.name});
        if(participantExists){
            return res.sendStatus(409);
        }

    await db.collection("participants").insertOne({name: participant.name, lastStatus: Date.now()});
    await db.collection("messages").insertOne({from: participant.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format('HH:MM:ss')});

    res.sendStatus(201);

    } catch (e) {
        console.log(e);
        return res.status(500).send("Erro de registro. Tente novamente ou contate o nosso suporte ", e);
    }
})

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(chalk.green("Server successfully connected!"));
});
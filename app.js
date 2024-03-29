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

app.post('/messages', async (req,res) =>{
    const {user} = req.headers;
    const message = req.body;

    const messageSchema = joi.object({
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.string().valid("message","private_message").required()
    })
    const {error} = messageSchema.validate(message, {abortEarly: false});

    if (error) {
        return res.status(422).send(error.details.map(detail => detail.message));
    }

    try {
        const findParticipant = await db.collection("participants").findOne({name: user})

        if(!findParticipant) {
            return res.sendStatus(422);
        }

        const {to,text,type} = message;
        await db.collection("messages").insertOne({from: user, to, text, type, time: dayjs().format('HH:mm:ss')});
        res.send(201);

    } catch (error) {
        return res.sendStatus(422).send("Erro ao enviar mensagem, entre em contato com a nossa equipe de suporte");
    }
})

app.post("/status", async(req,res) => {
    const {user} = req.headers;

    try {
        const participantExists = await db.collection("participants").findOne({name: user});
        if(!participantExists) {
            return res.sendStatus(404);
        }

        await db.collection("participants").updateOne({name: user}, {$set: {lastStatus: Date.now()}});
        res.sendStatus(200);

    } catch (e) {
        console.log("Falha ao atualizar status ", e);
        res.sendStatus(500);
    }
})

app.get('/participants', async (req,res) =>{
    try {
        const allparticipants = await db.collection("participants").find().toArray();
        res.send(allparticipants);
    } catch (e) {
        console.log(e);
        return res.status(500).send("Erro ao obter lista de participantes. Tente novamente ou contate o nosso suporte ", e);
    }
})

app.get('/messages', async (req,res) => {
    const limit = parseInt(req.query.limit);
    const {user} = req.headers;

    try {
        const loadedMessages = await db.collection("messages").find().toArray();
        const filteredMessages =  loadedMessages.filter(message => {
            const {from, to, type} = message;
            const toUser = to === "Todos" || (to === user || from === user);
            const isPublic = type === "message";

            return toUser || isPublic;

            
        })

        if(limit && limit !== NaN) {
           return res.send(filteredMessages.slice(-limit));
        }

        res.send (filteredMessages);
    } catch (e) {
        console.log("Falha ao obter mensagens", e);
        res.sendStatus(500);

        
    }

})

const TIMEOUT_CHECK_IDLE = 15*1000;
setInterval(async () => {
    const seconds = Date.now() - (10*1000);

        try {
            const idleParticipants = await db.collection("participants").find({lastStatus: {$lte: seconds}}).toArray();
            if(idleParticipants.length > 0) {
                const timeoutMessage = idleParticipants.map(idleUser => {
                    return {
                        from: idleUser.name,
                        to: "Todos",
                        text: "sai da sala...",
                        type: "status",
                        time: dayjs().format("HH:mm:ss")
                    }
                });
            
            await db.collection("messages").insertMany(timeoutMessage);
            await db.collection("participants").deleteMany({lastStatus: {$lte: seconds}})

            }
        } catch (e) {
            console.log("Falha ao remover os usuários inativos", e);
        }
}, TIMEOUT_CHECK_IDLE)
    

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(chalk.green("Server successfully connected!"));
});
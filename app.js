import express from 'express';
import chalk from 'chalk';
import dotenv from 'dotenv';


const app = express();
dotenv.config();





const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(chalk.green("Server successfully connected!"));
});
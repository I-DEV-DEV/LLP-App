import express from "express";
import {dirname} from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOST="127.0.0.1";
const PORT = process.env.PORT || 3000;
const APP = express();

APP.use(express.static("public"));
APP.use(bodyParser.urlencoded({extended: true}));

// Connect to MongoDB

const dbname = "LLP_APP";
const collectionName = "UserAvailable";

mongoose.connect('mongodb://localhost:27017/'+dbname);

const collectionSchema = new mongoose.Schema(
                                        {
                                            username: String,
                                            email: String,
                                            plan: String,
                                            password: String
                                        }
);

const collectionInstance = mongoose.model(collectionName, collectionSchema);

// ROUTES

// '/' -> Homepage endpoint

APP.get("/",(req, res)=> {
                                    //res.send("<h1>THE APP IS GOING LIVE</h1>");
                                    res.sendFile(__dirname+"/public/home.html");
                                }
);

APP.get('/signup-page', (req, res) => {
            res.sendFile(__dirname+"/public/registration-page.html")
        }
);

// '/register' -> Registration endpoint

APP.post("/register", async (req,res) => {
        const { username, email, plan, password } = req.body;

        if( await collectionInstance.findOne( { username } ) )
        {
            res.send(`
                    <h2>Registration failed.</h2>
                    <h3>Username already taken.</h3>
                `);
            return;
        }

        if( await collectionInstance.findOne( {email} ) )
        {
            res.send("Registration failed. Email already being used.")
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        try 
        {
            const userInstance = new collectionInstance( {username, email, plan, password: hashedPassword});
            await userInstance.save();
            res.send("Registration successful");
        }
        catch( error )
        {
            console.log(error);
            res.status(500).send("Registration failed");
        }
    }
);

// '/check-username' -> Checking username availability endpoint

APP.get('/check-username', async (req, res) =>
    {
        const { username } = req.query;
        try
        {
            const userAny = await collectionInstance.findOne({ username });
            if(userAny)
            {
                res.json( { available: false }); //Username already exists
            }
            else
            {
                res.json( { available: true }); //Username is available
            }
        }
        catch(error)
        {
            console.error("Error checking username availability",error);
            res.status(500).json( {error: "Internal Server Error" });
        }
    }
);


// Server listening
APP.listen(PORT,HOST,()=> {
        console.log(`App listening on ${HOST}:${PORT}`);
    }
);

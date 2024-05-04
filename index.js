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

mongoose.connect('mongodb://localhost:27017/LLP_APP');

const testSchema = new mongoose.Schema(
                                        {
                                            username: String,
                                            email: String,
                                            plan: String,
                                            password: String
                                        }
);

const testUser = mongoose.model('userTest',testSchema);

// ROUTES

// '/' -> Homepage endpoint

APP.get("/",(req, res)=> {
                                    //res.send("<h1>THE APP IS GOING LIVE</h1>");
                                    res.sendFile(__dirname+"/public/home.html");
                                }
);

// '/register' -> Registration endpoint

APP.post("/register", async (req,res) => {
        const { username, email, plan, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 12);
        try 
        {
            const tuser = new testUser( {username, email, plan, password: hashedPassword});
            await tuser.save();
            res.send("Registration successful");
        }
        catch( error )
        {
            console.log(error);
            res.status(500).send("registration failed");
        }
    }
);

// '/check-username -> Checking username availability endpoint

APP.get('/check-username', async (req, res) =>
    {
        const { username } = req.query;
        try
        {
            console.log("Here 1");
            const userAny = await testUser.findOne({ username });
            console.log("Here 2");
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

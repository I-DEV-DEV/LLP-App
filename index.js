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

mongoose.connect('mongodb://localhost:27017/'+dbname)
    .then(() => { console.log("Connected to MongoDB.") } )
    .catch( (err) => { console.log("MongoDB connection error:",err) } );

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
                            res.sendFile(__dirname+"/public/home.html");
                        }
);

// Sign up page

APP.get('/signup-page', (req, res) => {
            res.sendFile(__dirname+"/public/registration-page.html")
        }
);

// Sign in page

APP.get('/signin-page', (req, res) => {
            res.sendFile(__dirname+"/public/login-page.html")
        }
);

// '/register' -> Registration endpoint

APP.post("/register", async (req,res) => {
        const { username, email, plan, password } = req.body;

        if( await collectionInstance.findOne( { username } ) )
        {
            res.send("<h1>Registration failed.</h1><h2>Username already taken.</h2> <h3>Click <a href='/signup-page'>here</a> to return to the registration page.</h3>");   
            return;
        }

        if( await collectionInstance.findOne( {email} ) )
        {
            res.send("<h1>Registration failed.</h1><h2>Email already being used.</h2> <h3>Click <a href='/signup-page'>here</a> to return to the registration page.</h3>");
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        try 
        {
            const userInstance = new collectionInstance( {username, email, plan, password: hashedPassword});
            await userInstance.save();
            res.send("<h1>Registration successful</h1><h2>Click <a href='/signin-page'>here</a> to go to login page.</h2>");
        }
        catch( error )
        {
            console.log(error);
            res.status(500).send("<h1>Registration failed.</h1><h2>Internal Server Error.</h2><h3>Click <a href='/signup-page'>here</a> to return to the registration page.</h3>");
        }
    }
);

APP.post('/login', async (req, res) => {
        const { username, password } = req.body;
        try
        {
            const user = await collectionInstance.findOne( {username } );
            if( user === null )
            {
                res.send("<h1>Login failed. Check your credentials.</h1><h2>Return to login <a href='/signin-page'>page</a>.");            
                return;
            }

            if( user != null && await bcrypt.compare( password, user.password ) )
            {
                res.render(__dirname+"/views/dashboard.ejs");
                return;
            }
            else
            {
                res.send("<h1>Login failed. Check the credentials</h1><h2>Return to login <a href='/signin-page'>page</a>.")
                return;
            }
        }
        catch( error )
        {
            res.status(500).send("<h1>Login failed. Internal Server Error</h1><h2>Return to login <a href='/signin-page'>page</a>.")
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

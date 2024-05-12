import express from "express";
import {dirname} from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import session from "express-session";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOST="127.0.0.1";
const PORT = process.env.PORT || 3000;
const APP = express();

APP.use(express.static("public"));
APP.use(bodyParser.urlencoded({extended: true}));

APP.set('view engine', 'ejs')
APP.set('views', __dirname+"/views");

// Session Management
APP.use(session(
        {
            secret: 'secret',
            resave: false,
            saveUninitialized: false,
            cookie: 
                    {
                        maxAge: 1000 * 60 * 120,
                        secure: false,
                        httpOnly: true,
                        sameSite: 'strict'
                    }
        }
    )
)

// Authorization Middleware
const authorize = (req, res, next) => {
    //Check user is authenticated
    if( !req.session.userId ) {
        return res.status(401).send("Unauthorized");
    }
    //If user is authenticated, proceed to next middleware or route handler
    next();
}

// Session Validity Check Middleware
const checkSession = (req, res, next) =>
    {
        if(!req.session || !req.session.userId)
        {
            return res.redirect('/signin-page');
        }
        next();
    }

// Session reset Middleware

APP.use((req, res, next) =>
        {
            if(req.session.userId)
            {
                req.session._garbage = Date();
                req.session.touch();
            }
            next();
        }
)

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
                req.session.userId = user.username;
                res.redirect('/dashboard');
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

// Dashboard
APP.get('/dashboard', checkSession, authorize, (req, res) =>
    {
        const username = req.session.userId;
        res.render("dashboard.ejs", { user: username });
    }
)

// User logout
APP.post('/logout', (req, res) =>
    {
        req.session.destroy( err => {
                if(err)
                {
                    return res.status(500).send("Failed to Logout");
                }
                res.redirect('/signin-page');
            }
        )
    }
)

// Sidebars

const progressSchema = new mongoose.Schema(
    {
        username: String,
        language: String,
        course: String,
        courseCompleted: Boolean,
        completionDate: Date
    },
    {
        collection: 'uProgress'
    }
);
const progressName = "uProgress";
const progressInstance = mongoose.model(progressName, progressSchema);

APP.get('/progress', async (req, res) =>
    {
        const username = req.session.userId;
        const data = await progressInstance.find( { username: username }, {"_id": 0} );
        //console.log(username, data);
        if( data != null)
        {
            res.send(
                data
                /*
                {
                    "username": data.username,
                    "language": data.language,
                    "course": data.course,
                    "courseCompleted": data.courseCompleted,
                    "completionDate": data.completionDate
                }
                */
            );
        }
        else
        {
            res.send(
                {
                }
            );
        }
        
    }
)

APP.get('/lp-english', (req, res) =>
    {
        res.send("English Learning Path");
    }
)

APP.get('/lp-malayalam', (req, res) =>
    {
        res.send("Malayalam Learning Path");
    }
)

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


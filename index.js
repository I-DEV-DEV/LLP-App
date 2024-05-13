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

const dbname = "LLP_APP";
const collectionName =  "UserDetails"; // "UserAvailable"; // User details
const progressName =  "UserProgress"; // "uProgress"; // Progress Details

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
        status: String,
        ModifiedDate: Date
    },
    {
        collection: progressName
    }
);

const progressInstance = mongoose.model(progressName, progressSchema);

APP.get('/progress', async (req, res) =>
    {
        const username = req.session.userId;
        const data = await progressInstance.find( { username: username }, {"_id": 0, "__v": 0} );
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

APP.get('/lp-english',checkSession, authorize, (req, res) =>
    {
        const username = req.session.userId;
        res.render("lp-english.ejs",{ "language": "English", "user": username });
    }
)

APP.get('/lp-eng-alphabets',checkSession, authorize, async (req, res) =>
    {
        const username = req.session.userId;
        const data = await progressInstance.findOne( { username: username, language: "English", course: "Alphabets" } );

        if(! data)
        {
            const pgData = await new progressInstance({username: username, language: "English", course: "Alphabets", status:"In Progress", ModifiedDate: Date()});
            await pgData.save();
        }

        res.render("lp-eng-alph.ejs",{ "language": "English", "user": username });
    }
)

APP.get('/lp-eng-vow',checkSession, authorize, async (req, res) =>
    {
        const username = req.session.userId;
        
        const data = await progressInstance.findOne( { username: username, language: "English", course: "Vowels" } );

        if(! data)
        {
            const pgData = await new progressInstance({username: username, language: "English", course: "Vowels", status:"In Progress", ModifiedDate: Date()});
            await pgData.save();
        }

        res.render("lp-eng-vow.ejs",{ "language": "English", "user": username });
    }
)

APP.get('/lp-malayalam', checkSession, authorize, (req, res) =>
    {
        res.send("<h1>ഉടൻ വരുന്നു</h1>");
    }
)

APP.get('/lp-tamil', checkSession, authorize, (req, res) =>
    {
        res.send("<h1>விரைவில் வரும்</h1>");
    }
)

APP.get('/lp-telugu', checkSession, authorize, (req, res) =>
    {
        res.send("<h1>త్వరలో</h1>");
    }
)

APP.get('/lp-kannada', checkSession, authorize, (req, res) =>
    {
        res.send("<h1>ಶೀಘ್ರದಲ್ಲೇ ಬರಲಿದೆ</h1>");
    }
)

APP.get('/lp-hindi', checkSession, authorize, (req, res) =>
    {
        res.send("<h1>जल्द आ रहा है</h1>");
    }
)

APP.get('/lp-sanskrit', checkSession, authorize, (req, res) =>
    {
        res.send("<h1>शीघ्रेण आगच्छसि</h1>");
    }
)

APP.get('/lp-german', checkSession, authorize, (req, res) =>
    {
        res.send("<h1>Demnächst</h1>");
    }
)

APP.get('/lp-french', checkSession, authorize, (req, res) =>
    {
        res.send("<h1>À venir</h1>");
    }
)

APP.get('/lp-japanese', checkSession, authorize, (req, res) =>
    {
        res.send("<h1>カミング・スーン</h1>");
    }
)

APP.get('/lp-spanish', checkSession, authorize, (req, res) =>
    {
        res.send("<h1>Muy pronto</h1>");
    }
)

APP.get('/lp-korean', checkSession, authorize, (req, res) =>
    {
        res.send("<h1>곧 출시 예정</h1>");
    }
)

APP.get('/lp-greek', checkSession, authorize, (req, res) =>
    {
        res.send("<h1>Ερχομαι συντομα</h1>");
    }
)

APP.post('/eng-quiz', checkSession, authorize, async (req,res) =>
    {
        const username = req.session.userId;
        const data = await progressInstance.findOne( { username: username, language: "English", course: "Alphabets Assessment-1" } );
        if(! data)
        {
            const pgData = await new progressInstance({username: username, language: "English", course: "Alphabets Assessment-1", status:"Started", ModifiedDate: Date()});
            await pgData.save();
        }

        const value = req.body;
        if( value.answer === 'O' || value.answer === 'o')
        {
            progressInstance.updateOne( { username: username, language: "English", course: "Alphabets Assessment-1" }, {status: "Passed", ModifiedDate: Date() } )
            .then(result => console.log("Document updated successfully"))
            .catch(error => console.log("Error: ",error));
            res.send("<h1>Congratulations!!! You got the answer correct.</h1><h2>Click <a href='/dashboard'>here</a> to return to dashboard.");
        }
        else
        {
            progressInstance.updateOne( { username: username, language: "English", course: "Alphabets Assessment-1" }, {status: "Failed", ModifiedDate: Date() } )
            .then(result => console.log("Document updated successfully"))
            .catch(error => console.log("Error: ",error));
            res.send("<h1>Better luck next time...</h1><h2>Click <a href='/dashboard'>here</a> to return to dashboard.");
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


const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const dotenv = require('dotenv');
const MongoClient = require('mongodb').MongoClient;

dotenv.config();

const config = {
    sms: {
        test: process.env.SMS_TEST === 'true',
        username: process.env.SMS_USERNAME,
        hash: process.env.SMS_HASH,
        sender: process.env.SMS_SENDER || 'TXTLCL'
    },
    database: {
        url: process.env.DATABASE_URL
    },
    receipt_url: process.env.RECEIPT_URL,
    session_secret: process.env.SESSION_SECRET
};

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: config.session_secret
}));
app.use(express.static(path.join(__dirname, 'public')));

// for login/logout button on navbar
app.use((request, response, next) => {
    response.locals.isLoggedIn = request.session.isLoggedIn;
    next();
});

MongoClient.connect(config.database.url)
    .then((db) => {
        console.info('Connected to database');
        // const createEvent = require('./routes/createEvent')(db, config);
        const authenticate = require('./middleware/authenticate')(db, config);
        const login = require('./routes/login')(db, config);
        const logout = require('./routes/logout')();
        const viewParticipants = require('./routes/viewParticipants')(db, config);
        const promote = require('./routes/promote')(db, config);
        const admin = require('./routes/admin')(db, config);
        const textLocal = require('./routes/textLocal')(db, config);
        // app.post('/createEvent', createEvent);
        app.get('/login', (request, response) => {
            response.render('login');
        });
        app.get('/', (request, response) =>{
            response.render('index');
        });
        app.post('/login', login);
        app.get('/logout', logout);
        app.get('/viewParticipants/:id',authenticate, viewParticipants);
        app.post('/promote/:id', authenticate, promote);
        app.get('/admin', authenticate, admin);
        app.post('/textLocal', textLocal);
        // error handler
        app.use((req, res, next) => {
            const err = new Error('Not Found');
            err.status = 404;
            next(err);
        });

        app.use((err, req, res, next) => {
            // set locals, only providing error in development
            res.locals.message = err.message;
            res.locals.error = req.app.get('env') === 'development' ? err : {};

            // render the error page
            res.status(err.status || 500);
            res.render('error');
        });
    })
    .catch((error) => {
        console.error(error);
        process.exit(0);
    });

module.exports = app;
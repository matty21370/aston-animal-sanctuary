require('dotenv').config();
const express = require('express');
const session = require('express-session');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const bcrypt = require('bcrypt');
const saltRounds = 10;

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        saveUninitialized: false,
        resave: false
    })
);

mongoose.connect(process.env.DB_CONNECT, {useNewUrlParser: true, useUnifiedTopology: true})

const userSchema = mongoose.Schema({
    name: String,
    username: String,
    password: String
});

const User = mongoose.model("User", userSchema);

app.get("/", (req, res) => {
    if(req.session.username) {
        res.redirect("main");
    } else {
        res.render("home");
    }
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", (req, res) => {
    let _name = req.body.name;
    let _username = req.body.username;
    let _password = req.body.password;

    if(_name && _username && _password) {
        bcrypt.hash(_password, saltRounds, (err, hash) => {
            if(!err) {
                let _user = new User({
                    name: _name,
                    username: _username,
                    password: hash
                });
        
                _user.save();
                req.session.username = req.body.username;
                res.redirect("/main");
            }
        });
    } else {
        res.redirect('/register');
    }
});

app.get("/login", (req, res) => {
    res.render("signin");
});

app.post("/login", (req, res) => {
    let _username = req.body.username;
    let _password = req.body.password;

    if(_username && _password) {
        User.findOne({username: _username}, (err, user) => {
            if(err) {
                res.send(err);
            } else {
                if(user) {
                    bcrypt.compare(_password, user.password, (err, result) => {
                        if(result === true) {
                            req.session.username = _username;
                            res.redirect("/main");
                        } else {
                            res.redirect("/login");
                        }
                    });
                } else {
                    res.redirect('/login');
                }
            }
        });
    } else {
        res.redirect("/login");
    }
});

app.get("/main", (req, res) => {
    if(req.session.username) {
        res.render("main", {ejs_name: req.session.username});
    } else {
        res.redirect("/");
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if(err) {
            res.send(err);
        }

        res.redirect("/");
    })
});

app.get('/addstaff', (req, res) => {
    res.render('access');
});

app.post('/addstaff', (req, res) => {
    let _password = req.body.pass;
    if(_password === process.env.ADMIN_PASSWORD) {
        res.render('secret');
    }
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
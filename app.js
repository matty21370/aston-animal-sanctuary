require('dotenv').config();
const express = require('express');
const session = require('express-session');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const bcrypt = require('bcrypt');
const saltRounds = 10;

const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now);
    }
});

const upload = multer({storage: storage});

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

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
    password: String,
    role: String
});

const listingSchema = mongoose.Schema({
    name: String,
    description: String,
    avaliability: String,
    image:
    {
        data: Buffer,
        contentType: String
    }
});

const adoptionSchema = mongoose.Schema({
    listing: String,
    user: String,
    status: String
});

const User = mongoose.model("User", userSchema);
const Listing = mongoose.model("Listing", listingSchema);
const Adoption = mongoose.model("Adoption", adoptionSchema);

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
                    password: hash,
                    role: "Client"
                });
        
                _user.save();
                req.session.username = req.body.username;
                req.session.role = _user.role;
                res.redirect("/main");
            }
        });
    } else {
        res.redirect('/register');
    }
});

app.get("/login", (req, res) => {
    res.render("signin", {ejs_message: null});
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
                            req.session.role = user.role;
                            res.redirect("/main");
                        } else {
                            res.render("signin", {ejs_message: "Incorrect password"});
                        }
                    });
                } else {
                    res.render("signin", {ejs_message: "Invalid username"});
                }
            }
        });
    } else {
        res.render("signin", {ejs_message: "Please enter a username and password"});
    }
});

app.get("/main", (req, res) => {
    if(req.session.username) {
        Listing.find({}, (err, listings) => {
            if(err) {
                console.log(err);
            } else {
                if(req.session.role === "Staff") {
                    res.render("main", {ejs_name: req.session.username, ejs_staff: true});
                } else {
                    res.render("main", {ejs_name: req.session.username, ejs_staff: false});
                }
            }
        });
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
    if(req.body.adminpass) { //Access page
        let _password = req.body.adminpass;
        if(_password === process.env.ADMIN_PASS) {
            res.render('secret');
        } else {
            res.redirect("/addstaff")
        }
    } else if(req.body.password) { //Staff sign up page
        let _name = req.body.name;
        let _username = req.body.username;
        let _password = req.body.password;

        if(_name && _username && _password) {
            bcrypt.hash(_password, saltRounds, (err, hash) => {
                if(err) {
                    res.send(err);
                } else {
                    let newUser = new User({
                        name: _name,
                        username: _username,
                        password: hash,
                        role: "Staff"
                    });
                    newUser.save();
                    req.session.username = _username;
                    req.session.role = newUser.role;
                    res.redirect("/staff");
                }
            });
        } else {
            res.redirect("/addstaff");
        }
    }
});

app.get("/listings", (req, res) => {
    if(req.session.role === "Staff") {
        res.render("listings", {ejs_staff: true});
    } else {
        res.render("listings", {ejs_staff: false});
    }
});

app.post("/listings", (req, res) => {
    let listing = {

    }
});

app.get("/staff", (req, res) => {
    res.render("staffmain", {ejs_name: req.session.username});
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
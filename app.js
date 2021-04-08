require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

mongoose.connect(process.env.DB_CONNECT, {useNewUrlParser: true, useUnifiedTopology: true})

const userSchema = mongoose.Schema({
    name: String,
    username: String,
    password: String
});

const User = mongoose.model("User", userSchema);

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", (req, res) => {
    let _name = req.body.name;
    let _username = req.body.username;
    let _password = req.body.password;

    if(_name && _username && _password) {
        let _user = new User({
            name: _name,
            username: _username,
            password: _password
        });

        _user.save();
        res.redirect("/main");
    }
});

app.get("/login", (req, res) => {
    res.render("signin");
});

app.post("/login", (req, res) => {
    let _username = req.body.username;
    let _password = req.body.password;

    if(_username && _password) {
        User.findOne({username: _username}, (err, result) => {
            if(result) {
                if(result.password === _password) {
                    res.redirect("/main");
                    console.log(_username + " has logged in.");
                } else {
                    res.redirect("/login");
                }
            } else {
                res.redirect("/login");
            }
        });
    }
});

app.get("/main", (req, res) => {
    res.render("main");
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
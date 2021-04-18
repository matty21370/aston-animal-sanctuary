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

const app = express();

var multer = require('multer');
 
var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now())
    }
});
 
var upload = multer({ storage: storage });

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

const animalSchema = mongoose.Schema({
    name: String,
    status: String,
    adoptor: String,
    listingID: String
});

const listingSchema = mongoose.Schema({
    name: String,
    description: String,
    dob: Date,
    avaliability: String,
    image:
    {
        data: Buffer,
        contentType: String
    }
});

const adoptionSchema = mongoose.Schema({
    listing: String,
    name: String,
    user: String,
    status: String
});

const User = mongoose.model("User", userSchema);
const Animal = mongoose.model("Animal", animalSchema);
const Listing = mongoose.model("Listing", listingSchema);
const Adoption = mongoose.model("Adoption", adoptionSchema);

app.get("/", (req, res) => {
    if(req.session.username) {
        res.redirect("listings");
    } else {
        res.render("home");
    }
});

app.get("/register", (req, res) => {
    res.render("register", {ejs_message: null});
});

app.post("/register", (req, res) => {
    let _name = req.body.name;
    let _username = req.body.username;
    let _password = req.body.password;

    if(_name && _username && _password) {
        User.findOne({username: _username}, (err, result) => {
            if(!err) {
                if(result) {
                    res.render("register", {ejs_message: "Username already taken"});
                } else {
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
                            req.session.fullname = req.body.name;
                            req.session.role = _user.role;
                            res.redirect("/");
                        }
                    });
                }
            } else {
                res.send(err);
            }
        });
    } else {
        res.render('register', {ejs_message: "Please fill out all fields"});
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
                            req.session.fullname = user.name;
                            res.redirect("/");
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
                    req.session.fullname = _name;
                    req.session.role = newUser.role;
                    res.redirect("/");
                }
            });
        } else {
            res.redirect("/addstaff");
        }
    }
});

app.get("/listings", (req, res) => {
    if(req.session.username) {
        Listing.find({}, (err, results) => {
            if(err) {
                res.send(err);
            } else {
                if(req.session.role === "Staff") {
                    res.render("listings", {ejs_staff: true, ejs_listings: results});
                } else {
                    res.render("listings", {ejs_staff: false, ejs_listings: results});
                }
            }
        });
    } else {
        res.redirect("/");
    }
});

app.get("/test", (req, res) => {
    res.send("test");
});

app.get("/addlisting", (req, res) => {
    if(req.session.role === "Staff") {
        res.render("addlisting", {ejs_message: null});
    } else {
        res.redirect("/");
    }
});

app.post("/addlisting", upload.single('image'), (req, res, next) => {
    if(req.session.role === "Staff") {
        if(req.body.listingName && req.body.listingDescription) {
            let listing = {
                name: req.body.listingName,
                description: req.body.listingDescription,
                dob: req.body.dateOfBirth,
                avaliability: "Avaliable",
                image: {
                    data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
                    contentType: 'image/png'
                }
            }
            Listing.create(listing, (err, item) => {
                if(err) {
                    console.log(err);
                } else {
                    let animal = new Animal({
                        name: req.body.listingName,
                        status: "Avaliable",
                        adoptor: "",
                        listingID: item._id
                    });
                    animal.save();
                    res.redirect("/");
                }
            });
            //res.render("addListing", {ejs_message: "Listing successfully added"});
        } else {
            res.redirect("/addlisting");
        }
    } else {
        res.send("You do not have permission to perform this action.");
    }
});

app.get("/staff", (req, res) => {
    res.render("staffmain", {ejs_name: req.session.username});
});

app.get("/profile", (req, res) => {
    res.render("profile", {ejs_staff: req.session.role === "Staff", ejs_edit_mode: false, ejs_username: req.session.username, ejs_name: req.session.fullname, ejs_role: req.session.role});
});

app.post("/profile", (req, res) => {
    res.render("profile", {ejs_staff: req.session.role === "Staff", ejs_edit_mode: true, ejs_username: req.session.username, ejs_name: req.session.fullname, ejs_role: req.session.role});
});

app.post("/editprofile", (req, res) => {
    let _newName = req.body.form_name;
    let _newUsername = req.body.form_username;
    User.updateOne({username: req.session.username}, {name: _newName, username: _newUsername}, (err, result) => {
        if(err) {
            console.log(err);
        } else {
            req.session.fullname = _newName;
            req.session.username = _newUsername;
            res.redirect("/profile");
        }
    });
});

app.post("/adopt", (req, res) => {
    console.log(req.body.adoptButton);
    Listing.findById(req.body.adoptButton, (err, result) => {
        if(result) {
            if(!err) {
                let newAdoption = new Adoption({
                    listing: result._id,
                    name: result.name,
                    user: req.session.username,
                    status : "Requested"
                });
                newAdoption.save();
                res.redirect("/");
            }
        } else {
            res.send("Error");
        }
    });
});

app.get("/requests", (req, res) => {
    if(req.session.role === "Staff") {
        Adoption.find({status: "Requested"}, (err, results) => {
            if(!err) {
                res.render("requests", {ejs_listings: results});
            } else {
                console.log(err);
            }
        });
    } else {
        res.redirect("/");
    }
});

app.post("/approve", (req, res) => {
    Adoption.updateOne({_id: req.body.listingID}, {status: "Approved"}, (err, result) => {
        if(!err) {
            Listing.findByIdAndDelete(req.body.approveButton, (err, remove) => {
                if(err) {
                    console.log(err);
                } else {
                    if(result && remove) {
                        console.log(result.user);
                        Adoption.findById(req.body.listingID, (err, adoption) => {
                            Animal.updateOne({listingID: req.body.approveButton}, {status: "Adopted", adoptor: adoption.user}, (err, item) => {
                                if(!err) {
                                    res.redirect("/requests");
                                } else {
                                    console.log(err);
                                }
                            });
                        });
                    } else {
                        console.log("Could not find result");
                        res.redirect("/requests");
                    }
                }
            });
        } else {
            console.log(err);
        }
    })
});

app.post("/deny", (req, res) => {
    Adoption.updateOne({_id: req.body.denyButton}, {status: "Denied"}, (err, result) => {
        if(!err) {
            res.redirect("/requests");
        } else {
            console.log(err);
        }
    })
});

app.get("/adoptions", (req, res) => {
    if(req.session.role === "Client") {
        Adoption.find({user: req.session.username}, (err, results) => {
            if(!err) {
                if(results) {
                    res.render("userlistings", {ejs_listings: results});
                } else {
                    res.send("You have no adoption requests");
                }
            } else {
                console.log(err);
            }
        });
    } else {
        res.redirect("/");
    }
});

app.post("/remove", (req, res) => {
    if(req.session.role === "Staff") {
        Listing.findOneAndRemove({_id: req.body.removeButton}, (err, result) => {
            if(err) {
                console.log(err);
            } else {
                Adoption.updateOne({listing: req.body.removeButton}, {status: "Listing removed"}, (err, update) => {
                    if(err) {
                        console.log(err);
                    } else {
                        res.redirect("/");
                    }
                });
            }
        });
    } else {
        res.redirect("/");
    }
});

app.get("/animals", (req, res) => {
    if(req.session.role === "Staff") {
        Animal.find({}, (err, results) =>   {
            if(!err) {
                res.render("animals", {ejs_animals: results});
            } else {
                console.log(err);
            }
        });
    } else {
        res.redirect("/");
    }
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port);

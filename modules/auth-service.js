const mongoose = require("mongoose");
require("dotenv").config();// load variable from .env file into process.env
const bcrypt = require("bcryptjs");
let Schema = mongoose.Schema;

let userSchema = new Schema({
    userName:{
        type: String,
        unique: true,
    } ,
    password: String,
    email: String,
    loginHistory: [{
        dateTime: Date,
        userAgent: String
    }]
});

let User; //to be defined on new connection. works with the below User Obj.

function initialize(){
    return new Promise(function(resolve, reject){
        let db = mongoose.createConnection(process.env.MONGODB);
    
        db.on('error', (err) =>{
            reject(err);
        });
    
        db.once('open',()=>{
            User = db.model("users", userSchema);
            resolve();
        });
    });
}

function registerUser(userData){
    return new Promise(function(resolve, reject){
        if(userData.password == userData.password2){
            bcrypt.hash(userData.password, 10).then(hash =>{
                userData.password = hash;
                let newUser = new User(userData);
                newUser.save().then(()=>{
                    resolve();
                }).catch(err =>{
                if(err.code = 11000){
                reject("User Name already taken");
                }else{
                    reject("There was an error creating the user: " + err);
                }
            }).catch(err =>{
                reject("There was an error encrypting the password");
            })
        })}else{
            reject("Passwords do not match");
        }
    })
}

function checkUser(userData){
    return new Promise(function(resolve, reject) {
        User.find({userName: userData.userName})
        .exec()
        .then((users) =>{
            if(users.length == 0){// .length is used for both checking array and string size.
                reject("Unable to find user: " + userData.userName);
            }
            else{
                // while .find userName:userData.userName return unique value of users, 
                // .find always return with array. Due to that, when we use .find, we have to specify the first unique data with users[0]
                // others [1][2] and so on are empty.
                bcrypt.compare(userData.password, users[0].password).then((res) =>{
                    //(users.password !== bcrypt.hash(userData.password)) not this. use compare method
                    if(res == true){ // .compare method return bool
                        if(users[0].loginHistory.length == 8){
                            users[0].loginHistory.pop() // remove the last elem from the array
                        }
                        users[0].loginHistory.unshift({dateTime: (new Date()).toString(), userAgent: userData.userAgent});//add elem in the begging of array. adjust the length as well
                        User.updateOne({userName: users[0].userName}, 
                            {$set:{loginHistory: users[0].loginHistory}}
                            ).exec()
                            .then(() =>{
                                resolve(users[0]);
                            }).catch((err) =>{
                                reject("There was an error verifying the user: " + err);
                            })
                    }else{
                        reject("Incorrect Password for user: " + userData.userName);
                    }
                });
            }
        }).catch(err =>{
            reject("Unable to find user: " + userData.userName);
        });
    });
}

module.exports = {initialize, registerUser, checkUser};
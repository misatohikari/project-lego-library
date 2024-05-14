//Published URL: 


const legoData = require("./modules/legoSets");
const authData = require("./modules/auth-service");
const express = require('express');
const app = express();
const clientSessions = require("client-sessions");

const HTTP_PORT = process.env.PORT || 8080;

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(
  clientSessions({
    cookieName: 'session',
    secret: 'web322Assignment6SampleName',
    duration: 2* 60 * 1000,
    activeDuration: 60* 1000,
  })
);
app.use((req, res, next) =>{
  res.locals.session = req.session;
  next();
});

function ensureLogin(req, res, next){
  if(!req.session.user){
    res.redirect("/login");
  }else{
    next();
  }
}

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render("home")
});

app.get('/about', (req, res) => {
  res.render("about");
});

app.get("/login", (req, res) =>{
  res.render("login", {errorMessage: "", userName: ""});
});

app.get("/register", (req, res) => {
  res.render("register", { errorMessage: "", successMessage: "", userName: "", email: "" });
});


// try catch block is for synchronous code. .then() and .catch() with promises is for asynchronous error.
// or use keyword of async and await with try catch.
app.post("/register",(req, res) =>{
    authData.registerUser(req.body).then(() =>{
    res.render("register", {errorMessage: "", successMessage: "User Created", userName: "", email: ""});
    }).catch(err =>{
    res.render("register", {errorMessage: err, successMessage: "", userName: req.body.userName, email: req.body.email});
  });
});

app.post("/login", (req, res) =>{
  req.body.userAgent = req.get("User-Agent");
  authData.checkUser(req.body).then((user) =>{
    req.session.user = {
      userName: user.userName,
      email: user.email,
      loginHistory: user.loginHistory
    }
    res.redirect("lego/sets");
  }).catch(err =>{
    res.render("login",{errorMessage: err, userName: req.body.userName});
  });
});

app.get("/logout", (req, res) =>{
  req.session.reset();
  res.redirect("/");
});

app.get("/userHistory", ensureLogin, (req, res) =>{
  res.render("userHistory");
});

app.get("/lego/addSet", ensureLogin, async (req, res) => {
  let themes = await legoData.getAllThemes()
  res.render("addSet", { themes: themes })
});

app.post("/lego/addSet", ensureLogin, async (req, res) => {
  try {
    await legoData.addSet(req.body);
    res.redirect("/lego/sets");
  } catch (err) {
    res.render("500", { message: `I'm sorry, but we have encountered the following error: ${err}` });
  }

});

app.get("/lego/editSet/:num", ensureLogin, async (req, res) => {

  try {
    let set = await legoData.getSetByNum(req.params.num);
    let themes = await legoData.getAllThemes();

    res.render("editSet", { set, themes });
  } catch (err) {
    res.status(404).render("404", { message: err });
  }

});

app.post("/lego/editSet", ensureLogin, async (req, res) => {

  try {
    await legoData.editSet(req.body.set_num, req.body);
    res.redirect("/lego/sets");
  } catch (err) {
    res.render("500", { message: `I'm sorry, but we have encountered the following error: ${err}` });
  }
});

app.get("/lego/deleteSet/:num", ensureLogin, async (req, res) => {
  try {
    await legoData.deleteSet(req.params.num);
    res.redirect("/lego/sets");
  } catch (err) {
    res.status(500).render("500", { message: `I'm sorry, but we have encountered the following error: ${err}` });
  }
})

app.get("/lego/sets", async (req, res) => {

  let sets = [];

  try {
    if (req.query.theme) {
      sets = await legoData.getSetsByTheme(req.query.theme);
    } else {
      sets = await legoData.getAllSets();
    }

    res.render("sets", { sets })
  } catch (err) {
    res.status(404).render("404", { message: err });
  }

});

app.get("/lego/sets/:num", async (req, res) => {
  try {
    let set = await legoData.getSetByNum(req.params.num);
    res.render("set", { set })
  } catch (err) {
    res.status(404).render("404", { message: err });
  }
});

app.use((req, res, next) => {
  res.status(404).render("404", { message: "I'm sorry, we're unable to find what you're looking for" });
});

legoData.initialize()
.then(authData.initialize)
.then(() =>{
  app.listen(HTTP_PORT, () => { console.log(`server listening on: ${HTTP_PORT}`) });
}).catch(err => {
  console.log(`unable to start server: ${err}`);
});
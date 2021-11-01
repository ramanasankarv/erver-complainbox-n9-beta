var express = require('express')
var path = require('path');
var cookieParser = require('cookie-parser')
var logger = require('morgan')
const cors = require('cors')
const admin = require('firebase-admin')

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey('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');


const serviceAccount = require("./config/fbServiceAccountKey.json");

/// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  authDomain: "ecomplainbox-18f35.firebaseapp.com"
});


var app = express();

app.use(cors())
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Assign firestore to db variable 
var db= admin.firestore();

/* Check Token valid or not */
function checkAuth(req, res, next) {
  if (req.headers.authtoken) {
    admin.auth().verifyIdToken(req.headers.authtoken)
      .then(() => {
        next()
      }).catch(() => {
        res.status(403).send('Unauthorized')
      });
  } else {
    res.status(403).send('Unauthorized')
  }
}

function generate(n) {
  var add = 1, max = 12 - add;   // 12 is the min safe number Math.random() can generate without it starting to pad the end with zeros.   

  if ( n > max ) {
          return generate(max) + generate(n - max);
  }

  max        = Math.pow(10, n+add);
  var min    = max/10; // Math.pow(10, n) basically
  var number = Math.floor( Math.random() * (max - min + 1) ) + min;

  return ("" + number).substring(add); 
}
//app.use('/', checkAuth)

app.get('/', (req, res) => {
  db.collection('Users')
  .get()
  .then(querySnapshot => {
    const documents = querySnapshot.docs.map(doc => doc.data())
    res.json({message:documents});
  })
})

/*  
  Registration api 
  params email,fullname, password 
  Method : POST
 */

app.post('/registration', checkAuth, (req, res) => { 

  const otp = generate(6);
  const data = {
    Email: req.body.email,
    UserStatus: 'Active',
    UserRoleID: 'hqvWoXWRqePiznmneyj5',
    FullName: req.body.fullname,
    IsEmailVerified: 'No',
    IsMobileVerified: 'No',
    Password: req.body.password,
    CreatedAt: admin.firestore.FieldValue.serverTimestamp(),
    Mobile:req.body.mobile,
    EmailOtp: otp
  };
  
  const usersRef = db.collection('Users');
  const snapshot = usersRef.where('Email', '==', req.body.email).get().then(querySnapshot => {
  const documents = querySnapshot.docs.map(doc => doc.data())

    if(documents.length==0){
      db.collection('Users').add(data)
      .then(function(docRef) {
        
        const msg = {
          to: req.body.email,
          from: 'ramanasankarv@gmail.com', // Use the email address or domain you verified above
          subject: 'Please verify your email. Verification code '+otp,
          text: 'Hi, Please confirm your email address by entering the following code in e Complain Box. Verification code: '+otp+' Best, e Complain Box',
          html: 'Hi,<br>Please confirm your email address by entering the following code in e Complain Box. <br><br>Verification code: '+otp+'<br><br>Best,<br>e Complain Box',
        };

        sgMail
        .send(msg)
        .then(() => {
          console.log("mailsend")
        }, error => {
          console.error(error);

          if (error.response) {
            console.error(error.response.body)
          }
        });

        res.json({
          message: docRef,
        })
        console.log("Document written with ID: ", docRef.id);
      })
      .catch(function(error) {
        res.json({
          message: "Error adding document: ", error
        })
        console.error("Error adding document: ", error);
      });  
    }else{
      res.json({message:"Email Id exist"});
    }
  }).catch(function(error) {
    res.json({
      message: "Error adding document: ", error
    })
    console.error("Error adding document: ", error);
  });  
})

app.post('/getemailbymobile',  (req, res) => { 

  const data = {
    Mobile:req.body.mobile
  };
  
  const usersRef = db.collection('Users');
  const snapshot = usersRef.where('Mobile', '==', parseInt(req.body.mobile)).limit(1).get().then(querySnapshot => {
    
    const documents = querySnapshot.docs.map(doc => doc.data())
    console.log(documents);
    if(documents.length==0){
       res.json({message:"Mobile not found in our DB"});
    }else{
      const user = documents;

      res.json({userEmail:user[0].Email});
    }
  }).catch(function(error) {
    res.json({
      message: "Error adding document: ", error
    })
    console.error("Error adding document: ", error);
  });  
})

app.post('/emailverification',  (req, res) => { 

  
  const usersRef = db.collection('Users');
  const snapshot = usersRef.where('Email', '==', req.body.email).limit(1).get().then(querySnapshot => {
    
    const documents = querySnapshot.docs.map(doc => doc.data())
    console.log(documents);
    if(documents.length==0){
       res.json({message:"Email not found in our DB"});
    }else{
      const user = documents;
      if(req.body.otp==user[0].EmailOtp){
        db.collection('Users').doc(req.body.docId).update({IsEmailVerified:"Yes"});
        //admin.firebase().ref('Users/' + req.body.docId + '/IsEmailVerified').set('Yes');
        res.json({message:"success"}); 
      }else{
        res.json({message: "invalid otp "}); 
      }
    }
  }).catch(function(error) {
    res.json({
      message: "Error adding document: ", error
    })
    console.error("Error adding document: ", error);
  });  
})

app.post('/mobileverification',  (req, res) => { 

  if(req.body.otp=="091011"){
    db.collection('Users').doc(req.body.docId).update({IsMobileVerified:"Yes"});
    res.json({message:"success"}); 
  }else{
    res.json({message: "invalid otp "}); 
  }

})

app.post('/userdata', (req, res) => { 

  
  const usersRef = db.collection('Users');
  const snapshot = usersRef.where('Email', '==', req.body.email).limit(1).get().then(querySnapshot => {
    
    const documents = querySnapshot.docs.map((doc) => {
        return { id: doc.id, ...doc.data() }
    })
    console.log(documents);
    if(documents.length==0){
       res.json({message:"Email not found in our DB"});
    }else{
      const user = documents;
      console.log(documents);
      res.json({user:user});
    }
  }).catch(function(error) {
    res.json({
      message: "Error adding document: ", error
    })
    console.error("Error adding document: ", error);
  });  
})

app.post('/')

module.exports = app;
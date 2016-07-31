var express = require('express');
var router = express.Router();
var request = require('request');
var config = require('config');
var hostname = config.get('Hostname.url');

/* GET home page. */
router.get('/', function(req, res, next) {
    // Force page refresh on redirects and hitting "go back" button.
    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');

    var renderData = {
        title: 'FlashGlotChat',
        loginMessage: null,
        errorMessage: null,
        usernameInputPlaceholder: 'Set username...',
        loggedIn: currUser
    }

    var currUser = req.session.username;
    if (!currUser) {
        renderData.errorMessage = 'Please set a username before joining a room';
    } else {
        renderData.loginMessage = 'Logged in as ' + currUser + '.';
        renderData.usernameInputPlaceholder = 'Change username...'
    }

    res.render('index', renderData);
});

router.post('/messages', function(req, res, next) {
    console.log(hostname+'users/'+req.body.user_id+'/chatrooms/'+req.body.room_id+'/messages');
   request({url: hostname+'users/'+req.body.user_id+'/chatrooms/'+req.body.room_id+'/messages'}, function (error, response, body) {
        if (!error && response.statusCode === 201) {
            return res.json(response.body);
        }else {
            console.log(error);
        }
   });
});

router.post('/chatrooms', function(req, res, next) {
    request({url: hostname+'users/'+req.body.user_id+'/chatrooms'}, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            return res.json(response.body);
        }else {
            console.log(error);
        }
   });
});


module.exports = router;


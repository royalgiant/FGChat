var express = require('express');
var router = express.Router();

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

module.exports = router;


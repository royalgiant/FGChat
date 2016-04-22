var express = require('express');
var app = express();
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var cookie = require('cookie');
var bodyParser = require('body-parser');
var http = require('http').Server(app);
var request = require('request');
var io = require('socket.io')(http);
var session = require('express-session');

// Routers
var indexRouter = require('./routes/index.js');

var PORT = process.env.PORT || 3001;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/', express.static(__dirname + '/public'));
app.use('/bower_components',  express.static(__dirname + '/bower_components'));
app.use(session({secret: 'keith', resave: true, saveUninitialized: true}));

app.use('/', indexRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

var hostname = function() {
    if(app.get('env') === 'development') {
        return 'http://localhost:3000/';
    } else {
        return 'flashglot.com';
    }
};

var connectedUsers = {};

io.on('connection', function(socket) {
    var cookie_holder = cookie.parse(socket.handshake.headers.cookie);
    var userID = cookie_holder['c_user'];
    var name = cookie_holder['c_name'];
    var room = JSON.parse(cookie_holder['room']);
    
    socket.name = name; // Store name in socket session for this client
    socket.uid = cookie['c_user']; // Store user id in socket session for this client
    socket.room = cookie['room']; // Store room id in socket session for this client
    connectedUsers[userID] = socket; // Use the userID as the key to the socket
    socket.join(room._id.$oid); // Join the room with their chat partner
    
    socket.on('chat message', function(msgInfo) {
        // Send that message to everyone.
        io.emit('chat message', msgInfo);
        messagesURL = hostname()+"users/"+userID+"/chatrooms/"+room._id.$oid+"/messages"
        
        var options = {
            url: messagesURL,
            headers: {'User-Agent': 'Super Agent/0.0.1', 'Content-Type': 'application/json'},
            method: 'POST',
            json: {user_name: name, message: msgInfo.message}
        };
        
        request(options, function (error, response, body) {
            if (!error && response.statusCode == 201) {
                // Print out the response body
                console.log('works');
            } else {
                console.log(error);
            }
        })
    });

    socket.on('switchRoom', function(newroom){
        // leave the current room (stored in session)
        socket.leave(socket.room);
        // join new room, received as function parameter
        socket.join(newroom);
        // update socket session room title
        socket.room = newroom;
        io.emit('switchedRoom', newroom);
    });

    socket.on('disconnect', function() {
        delete connectedUsers[userID];
        io.emit('user disconnected', name);
    });
});

http.listen(PORT, function() {
    console.log('Listening on port ' + PORT);
});
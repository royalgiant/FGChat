// Used by room.jade. This JS renders a Chat App for every chat room.
var socket = io();
var limit = 200;
var uiLimit = 100;
var maxChatMessageLength = '400';
var timeZoneOffsetHours = new Date().getTimezoneOffset() / 60;
var Grid = ReactBootstrap.Grid;
var Row = ReactBootstrap.Row;
var Col = ReactBootstrap.Col;
var Modal = ReactBootstrap.Modal;
var Button = ReactBootstrap.Button;

// Seconds since Unix Epoch. Used to convert between the database
// timestamp and client JS timestamp. However it is much easier to
// just do it in postgresql queries, as they have a lot of good 
// date/time functions.
function getCurrUnixTime() {
    return Math.floor((new Date().getTime()) / 1000);
}

function convertToHHMI(unix_time) {
    var days = Math.floor(unix_time / 86400);
    var hours = Math.floor((unix_time - (days * 86400)) / 3600);
    var minutes = Math.floor((unix_time - ((hours * 3600) + (days * 86400))) / 60);
    hours -= timeZoneOffsetHours;
    if (hours < 0) {
        hours = 24 + hours;
    }
    if (minutes < 10) {
        minutes = '0' + minutes;
    }
    if (hours < 10) {
        hours = '0' + hours;
    }

    return hours + ':' + minutes;
}

function getEnvironment() {
    if (document.URL.toString() === "http://localhost:3000/") {
        return "http://localhost:3000/";
    } else {
        return 'flashglot.com';
    }
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i<ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1);
        if (c.indexOf(name) == 0) return c.substring(name.length,c.length);
    }
    return "";
}

// Flux Architecture
// ChatApp is the central state store. Notice that all other React
// components use props, not state. Whenever a state in ChatApp changes
// usually by recieving a socket message from other user, the props
// are updated automatically by React.js. This makes development simple,
// as ChatApp is the only React component that is dynamic.
var ChatApp = React.createClass({
    getInitialState: function() {
        // Handle socket chat message from other users
        socket.on('user connected', this.handleConnection);
        socket.on('user disconnected', this.handleConnection);
        socket.on('chat message', this.messageReceive);
        socket.on('switchedRoom', this.switchedRoomMessageHistory);
        var environment = getEnvironment();
        var room = JSON.parse(unescape(getCookie('room')));
        return {messages: [], rooms: [], env: environment, 
            uid: getCookie('c_user'), 
            name: getCookie('c_name'), 
            room: room._id.$oid
        };
    },
    componentDidMount: function() {
        this.messageHistoryLoad();
        this.chatRoomListLoad();
    },

    messageHistoryLoad: function() {
        // On ChatApp load, grab message history of current chat room from the /messages API
        $.ajax({
            url: this.state.env+'users/'+this.state.uid+'/chatrooms/'+this.state.room+'/messages',
            dataType: 'json',
            crossDomain: true,
            success: function(data) {
                this.setState({messages: data.messages});
            }.bind(this),
            failure: function(xhr, status, err) {
                console.err(url, status, err.toString());
            }.bind(this)
        });
    },

    chatRoomListLoad: function() {
        // On ChatApp load, grab chatrooms the user is participating in
        $.ajax({
            url: this.state.env+'users/'+this.state.uid+'/chatrooms',
            dataType: 'json',
            crossDomain: true,
            success: function(data) {
                this.setState({rooms: data.chatrooms});
            }.bind(this),
            failure: function(xhr, status, err) {
                console.err(url, status, err.toString());
            }.bind(this)
        });
    },
    
    // Called when app detects a new message from SocketIO
    messageReceive: function(msgInfo) {
        if (msgInfo.room_name === this.state.room) {
            // Create a new msgInfo for this current React app
            var newMsg = {
                user_name: msgInfo.user_name,
                message: msgInfo.message,
                created_at: msgInfo.created_at
            };
            // Here we are concatenating the new emitted message into our ChatApp's messages list
            var messages = this.state.messages;
            var newMessages = messages.concat(newMsg);
            this.setState({messages: newMessages});
        }
    },

    switchedRoomMessageHistory: function(newroom) {
        this.setState({room: newroom});
        this.messageHistoryLoad();
    },

    render: function() {
        let savedPhraseModalClose = () => this.setState({savedPhraseModalShow: false});

        return (
            <Grid fluid={true}>
                <Row className='chatApp'>
                    <Col lg={4} mdPush={5} className='chatRoomList'><ChatRoomsList rooms={this.state.rooms} name={this.state.name} /></Col>
                    <Col lg={8} mdPush={5} className='messageList'>
                        <Col onMouseUp={ ()=>this.setState({ savedPhraseModalShow: true })}>
                            <MessagesList messages={this.state.messages} /> 
                        </Col>
                        <ChatForm name={this.state.name} room={this.state.room}/>
                    </Col>
                </Row>
            </Grid>
        );
    }
});

var ChatRoomsList = React.createClass({
    render: function() {
        var name = this.props.name.replace(/\W+/g, " ");
        var roomNodes = this.props.rooms.map(function(room, i) {
            if (room.chatroom.users_names.length === 2 && name === room.chatroom.users_names[0]) {
                room_name = room.chatroom.users_names[1].replace(/\W+/g, " ");
            } else if (room.chatroom.users_names.length === 2 && name === room.chatroom.users_names[1]) {
                room_name = room.chatroom.users_names[0].replace(/\W+/g, " ");
            } else {
                room_name = "Chat between "+ (room.chatroom.users_names[0] +" and "+ room.chatroom.users_names[1]).replace(/\W+/g, " ");
            }
            
            return (
                <ChatRoom roomName={room_name} key={i} room_id={room.chatroom._id.$oid}/>
            );
        });
        return (
            <ul>
                {roomNodes}
            </ul>
        );
    }
});

var ChatRoom = React.createClass({
    switchRoom: function(){
        socket.emit('switchRoom', this.props.room_id);
    },
    render: function() {
        var roomName = this.props.roomName;
        return (
                <li className='room' onClick={this.switchRoom}>
                    {roomName}
                </li>
        );
    }
});

var MessagesList = React.createClass({
    componentDidMount: function() {
        var messagesList = this.refs.messagesList;
    },
    render: function() {
        var messageNodes = this.props.messages.map(function(msg, i) {
            return (<Message msg={msg} key={i} />);
        });
        
        return (
            <ul className='messagesList' ref='messagesList'>
                {messageNodes}
            </ul>
        );
    }
});

var Message = React.createClass({
    componentDidMount: function() {
        var messageDOM = this.refs.message;
        messageDOM.scrollIntoView();
    },
    render: function() {
        var msg = this.props.msg;
        return (
            <li className='message' ref='message'>
                <span className='messageTime'>
                    { Number.isInteger(msg.created_at)? convertToHHMI(msg.created_at) : convertToHHMI(Date.parse(msg.created_at)) } 
                </span>
                <b className='username'>{msg.user_name.replace(/\W+/g, " ")}</b> 
                <span className='messageText'>: {msg.message}</span>
            </li>
        );
    }
});

var ChatForm = React.createClass({
    handleSubmit: function(e) {
        e.preventDefault();

        // The DOM node for <input> chat message
        var msgDOMNode = this.refs.msg;

        if (msgDOMNode.value === '') {
            return;
        }

        var msgInfo = {
            room_name: this.props.room,
            message: msgDOMNode.value,
            user_name: this.props.name,
            created_at: getCurrUnixTime()
        };
     
        socket.emit('chat message', msgInfo);
        msgDOMNode.value = '';
    },
    render: function() {
        return (
            <form className='chatForm' onSubmit={this.handleSubmit}>
                <input className='input_field chat_input_field' type='text' maxLength={maxChatMessageLength} placeholder='Say something...' ref='msg'/>
            </form>
        );
    }
})

ReactDOM.render(
    <ChatApp uiLimit={uiLimit}/>,
    document.getElementById('app')
);


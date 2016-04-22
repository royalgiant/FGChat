# Multi-Chatroom on Express, MongoDB, ReactJS, and Node
To do: 
- Release a live demo
- Integrate mongoose and create the needed tables (i.e. chatrooms, messages, users)
- Have a users sign in table to allow them to sign into chat.


## How to Run using PM2
Using PM2 - production process manager for Node.js
Install it
pm2 stop all --watch 0 -- to stop all processes
pm2 start all --watch 1 -- to start all processes
pm2 logs -- to get a stream of the logs

## How to Run using Node
cd FGChat
node app.js
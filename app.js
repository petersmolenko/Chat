const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);

app.use(express.static('src'));
server.listen(3000);

class Db {
    constructor(){
        this.collections = {};
    }

    createCollection(title){
        this.collections[title] = new Collection();
    }
}

class Collection {
    constructor(){
        this.items = [];
        this.count = 0
    }


    findItem(key){
        return this.items.find(el => el.id === key)
    }

    addItem(item){
        this.items.push(item);
        this.count++
    }

    getItems(fields){
        if (fields){
            const reqFields = fields.split(', ');

            return {
                items: this.items.map(el=>{
                    const res = {};
                    for (const prop in el){
                        if(reqFields.includes(prop)){
                            res[prop] = el[prop]
                        }
                    }

                    return res
                }),
                count: this.count
            }
        } else return {
            items: this.items,
            count: this.count
        }
        
    }
}

class CollectionItem {
    constructor(id){
        this.id = id
    }

    set(prop, value){
        this[prop] = value
    }

    get(prop) {
        return this[prop]
    }
}

class User extends CollectionItem {
    constructor(names, reg_date){
        super(names.nick);
        this.name = names.name;
        this.reg_date = reg_date;
        this.nick = names.nick;
        this.is_online = false;
        this.ava = null
    }
}

class Message extends CollectionItem {
    constructor(message){
        super(message.time);
        this.author = message.author;
        this.body = message.body;
        this.time = message.time;
    }

    getTime(){
        const time = new Date(this.time);

        return `${(time.getHours() < 10)?'0':''}${time.getHours()}:${(time.getMinutes() < 10)?'0':''}${time.getMinutes()}`

    }
}


const db = new Db();
db.createCollection('users');
const users = db.collections.users;
db.createCollection('messages');
const messages = db.collections.messages;

const connections = {};

const chatPassword = 'password';

app.get('/', function(request, response) {
    response.sendFile(__dirname + '/index.html')
})

io.sockets.on('connection', socket=>{
    let socketUser = null;
    console.log('User connected!');

    socket.on('disconnect', data=>{
        if(socketUser) {
            connections[socketUser]--;
            if (connections[socketUser] === 0) {
                users.findItem(socketUser).set('is_online', false);
                io.sockets.emit('outUser', socketUser)
            }  
        }
        console.log('User disconnected.');
    })



    socket.on('eAuth', user=>{
        const dbUser = users.findItem(user.nick);

        function authUser(nick){
            socketUser = users.findItem(nick).get('nick');
            connections[socketUser] = connections[socketUser]?++connections[socketUser]:1;
            users.findItem(nick).set('is_online', true);
            io.sockets.emit('authSuccess', {
                currentUser: users.findItem(nick),
                users: users.getItems(),
                messages: messages.getItems().items
                    .filter(mess=>{
                        return users.findItem(nick).reg_date < mess.time
                    })
                    .reduce((ac, mess)=>{
                        const message = Object.assign({}, mess);
                        message.time = mess.getTime();
                        ac.push(message);
                        return ac
                    }, [])
            });
            io.sockets.emit('newUser', users.findItem(nick))
        }

        if (dbUser && dbUser.name !== user.name){
            io.sockets.emit('authError', 'Пользователь с таким ником уже есть!')
        } else {
            if (!dbUser) {
                io.sockets.emit('getPassword');
                socket.on('sendPassword', data=>{
                    if(data.password === chatPassword) {
                        users.addItem(new User(data.authData, Date.now()));
                        authUser(data.authData.nick);
                    } else {
                        io.sockets.emit('wrongPassword', 'Пароль не верный!');
                    }
                })
            } else authUser(user.nick)
            
        }

        socket.on('sendMessage', message=>{
            messages.addItem(new Message(message));
            message.time = messages.findItem(message.time).getTime()
            io.sockets.emit('newMessage', message)
        });

        socket.on('setImg', img=>{
            users.findItem(img.user).set('ava', img.img);
            io.sockets.emit('avaUpdate', img)
        })
    })
})

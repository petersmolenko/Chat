const wrapper = document.querySelector('.wrapper');

function renderMessage(message, lastAuthor, currentAuthor){
    if (message.author === lastAuthor){
        messagesArea.lastElementChild.querySelector('.messages-area__messagesBlock').innerHTML += Handlebars.compile(messageTemplate.textContent)({message: message})
    } else {
        messagesArea.innerHTML += Handlebars.compile(messageBlockTemplate.textContent)({message: message});
    }
    if(message.author === currentAuthor) messagesArea.lastElementChild.classList.add('messages-area__user-messages_current-user')
    messagesArea.parentNode.scrollTop = messagesArea.parentNode.scrollHeight;
}

wrapper.innerHTML = (Handlebars.compile(authFormTemplate.textContent)())

const socket = io.connect();

const user_name = document.querySelector('#userNameField');
const user_nick = document.querySelector('#userNickField');
const aut_btn = document.querySelector('#auth_btn');

aut_btn.addEventListener('click', e=>{
    e.preventDefault();

    let authData = {
        name: user_name.value, 
        nick: user_nick.value
    };

    socket.emit('eAuth', authData)

    socket.on('getPassword', ()=> {
        wrapper.innerHTML = (Handlebars.compile(regFormTemplate.textContent)());
        reg_btn.addEventListener('click', ()=>{
            socket.emit('sendPassword', {
                password: passwordField.value,
                authData: authData
            })
        })
    });

    socket.on('wrongPassword', (data)=> {
        if(error_block.textContent){
            error_block.textContent = '';
            setTimeout(()=>{
                error_block.textContent = data
            }, 200)
        } else {
            error_block.textContent = data
        }
        
    });

    socket.on('authSuccess', data=> {
        socket.off('getPassword')
        const currentUser = data.currentUser;
        let messAuthor = null;
        console.log(data.users);

        data.users.onlineCount = data.users.items.reduce((ac, el)=>{
            if (el.is_online) ++ac;
            return ac
        }, 0);

        wrapper.innerHTML = Handlebars.compile(mainTemplate.textContent)({
            currentUser: currentUser,
            users: data.users
        });

        data.messages.forEach(mess=>{
            renderMessage(mess, messAuthor, currentUser.nick);
            users_list.querySelector(`[data-user="${mess.author}"]`).querySelector('.usersBlock__item-message').textContent = mess.body;
            messAuthor = mess.author
        })


        socket.off('authSuccess');
        socket.off('authError');
        socket.off('wrongPassword');

        socket.on('newUser', user=> {
            const curUserEl = users_list.querySelector(`[data-user="${user.nick}"]`);
            if (currentUser.nick !== user.nick){
                if (!curUserEl){
                    users_list.innerHTML += Handlebars.compile(userAsideTemplate.textContent)(user);
                    users_online_here.textContent = Number(users_online_here.textContent) + 1;
                    users_online.textContent = Number(users_online.textContent)+ 1
                } else {
                    if (!curUserEl.firstElementChild.classList.contains('usersBlock__item-avatarBlock_online')){
                        curUserEl.firstElementChild.classList.add('usersBlock__item-avatarBlock_online');
                        users_online.textContent = Number(users_online.textContent)+ 1
                    }
                }  
                
            }
        });

        socket.on('outUser', nick=> {
            users_list.querySelector(`[data-user="${nick}"]`).firstElementChild.classList.remove('usersBlock__item-avatarBlock_online');
            users_online.textContent = Number(users_online.textContent) - 1
        });

        sendBtn.addEventListener('click', e=>{

            socket.emit('sendMessage', {
                author: currentUser.nick, 
                body: sendField.value,
                time: Date.now()
            });
            sendField.value = ''
        });

        socket.on('newMessage', message=> {
            renderMessage(message, messAuthor, currentUser.nick);
            users_list.querySelector(`[data-user="${message.author}"]`).querySelector('.usersBlock__item-message').textContent = message.body;
            messAuthor = message.author
        });

        settingsBtn.addEventListener('click', ()=>{
            wrapper.style.filter = 'blur(3px)'
            const avaEditor = document.createElement('div');
            avaEditor.className = 'load-form__container';
            avaEditor.innerHTML = Handlebars.compile(photoEditor.textContent)();
            wrapper.after(avaEditor);

            photoEditorCloseBtn.addEventListener('click', ()=>{
                avaEditor.remove();
                wrapper.style.filter = ''
            });

            photoEditorCancelBtn.addEventListener('click', ()=>{
                avaEditor.remove();
                wrapper.style.filter = ''
            })

            const canvas = document.getElementById("avaEditorCanvas");
            const context = canvas.getContext("2d");
            const img = new Image();
            img.src = 'images/fr.jpg';

            class AvatarImage {
                constructor(){
                    this.x = 0;
                    this.y = 0;
                    this.width = 0;
                    this.height = 0;
                }
            }
            class BorderSetter {
                constructor(size, endPoints, sizePointer){
                    this.size = Math.floor(size);
                    this.topLeft = endPoints.topLeft;
                    this.sizePointer = sizePointer;
                }

                setEndPoints(size){

                }

                render(){
                    function createPoint(x, y, size, id) {
                        const point = document.createElement('div');
                        point.id = id;
                        point.style.width = size + 'px';
                        point.style.height = size + 'px';
                        point.style.background = 'black';
                        point.style.position = 'absolute';
                        point.style.top = `${Math.round(y)}px`;
                        point.style.left = `${Math.round(x)}px`;
                        point.className = 'borderSetter__point'

                        return point
                    };

                    const borderSetterContainer = document.createElement('div');
                    const borderSetter = document.createElement('div');
                    const borderSetterCircle = document.createElement('div');

                    borderSetterContainer.style.width = this.size - 4 + 'px';
                    borderSetterContainer.style.height = this.size - 4 + 'px';
                    borderSetterContainer.style.border = '2px solid black';
                    borderSetterContainer.style.position = 'absolute';
                    borderSetterContainer.style.top = this.topLeft.y + 'px';
                    borderSetterContainer.style.left = this.topLeft.x + 'px';
                    borderSetterContainer.id = 'borderSetterItem'

                    borderSetter.style.width = '100%';
                    borderSetter.style.height = '100%';
                    borderSetter.id = 'borderSetterCircle'
                    borderSetter.style.background = 'rgba(0,0,0, .6)';
                    borderSetter.style.borderRadius = '50%';



                    const points = [
                        createPoint(-(this.sizePointer/2), -(this.sizePointer/2), this.sizePointer, 'pointTopLeft'),
                        createPoint(this.size - 4 - (this.sizePointer/2), - (this.sizePointer/2), this.sizePointer, 'pointTopRight'),
                        createPoint(this.size - 4 - (this.sizePointer/2), this.size - 4 - (this.sizePointer/2), this.sizePointer, 'pointBottomRight'),
                        createPoint(-(this.sizePointer/2), this.size - 4 - (this.sizePointer/2), this.sizePointer, 'pointBottomLeft')
                    ];

                    borderSetter.append(...points);
                    borderSetterContainer.append(borderSetter);

                    photoEditorArea.style.position = 'relative';

                    photoEditorArea.append(borderSetterContainer)
                }

                move(offset){
                    this.size += offset;
                    this.render();
                }
            }
            const avatar = new AvatarImage();


            img.addEventListener('load', ()=>{
                photoEditorSaveBtn.addEventListener('click', ()=>{
                    const whRelation = img.width/img.height;

                    if(whRelation < 1) {
                        avatar.height = (img.height > canvas.height)?canvas.height:img.height;
                        avatar.width = avatar.height * whRelation;
                    } else {
                        avatar.width = (img.width > canvas.width)?canvas.width:img.width;
                        avatar.height = avatar.width / whRelation
                    }

                    avatar.x = (canvas.width - avatar.width) / 2;
                    avatar.y = (canvas.height - avatar.height) / 2;

                    context.drawImage(img, avatar.x, avatar.y, avatar.width, avatar.height);

                    const borderSetterSize = (whRelation<1)?avatar.width:avatar.height;
                    const borderSetterPoints = {
                        topLeft: {
                            x: avatar.x,
                            y: avatar.y
                        },
                        topRight: {
                            x: avatar.x + borderSetterSize,
                            y: avatar.y
                        },
                        bottomRight: {
                            x: avatar.x + borderSetterSize,
                            y: avatar.y + borderSetterSize
                        },
                        bottomLeft: {
                            x: avatar.x,
                            y: avatar.y + borderSetterSize
                        }
                    };
                    
                    const borderSetter = new BorderSetter(borderSetterSize, borderSetterPoints, 12);
                    borderSetter.render();

                    borderSetterItem.addEventListener('mousedown', e=>{
                        if(e.target.classList.contains('borderSetter__point')){
                            function moveBS(e){
                                borderSetterItem.style.width = borderSetterItem.clientWidth + e.movementY + 'px';
                                borderSetterItem.style.height =borderSetterItem.clientHeight + e.movementY + 'px';
                                pointTopLeft.style.left = -(pointTopLeft.clientWidth/2)+'px';
                                pointTopLeft.style.top = -(pointTopLeft.clientWidth/2)+'px';
                                pointTopRight.style.left = borderSetterItem.clientWidth-(pointTopLeft.clientWidth/2) + 'px';
                                pointTopRight.style.top = -(pointTopLeft.clientWidth/2)+'px';
                                pointBottomRight.style.top = borderSetterItem.clientWidth-(pointTopLeft.clientWidth/2) + 'px';
                                pointBottomRight.style.left = borderSetterItem.clientWidth-(pointTopLeft.clientWidth/2) + 'px';
                                pointBottomLeft.style.left = -(pointTopLeft.clientWidth/2)+'px';
                                pointBottomLeft.style.top = borderSetterItem.clientWidth-(pointTopLeft.clientWidth/2) + 'px';
                            }

                            borderSetterItem.addEventListener('mousemove', moveBS);
                            photoEditorArea.addEventListener('mousemove', moveBS);
                            // borderSetterItem.addEventListener('mouseup', e=>{
                            //     borderSetterItem.removeEventListener('mousemove', moveBS);
                            //      photoEditorArea.removeEventListener('mousemove', moveBS);
                            // });
                            document.addEventListener('mouseup', e=>{
                                borderSetterItem.removeEventListener('mousemove', moveBS);
                                 photoEditorArea.removeEventListener('mousemove', moveBS);
                            }, true);
                            // borderSetterItem.addEventListener('mouseout', e=>{
                            //     console.log(e);
                            //     borderSetterItem.removeEventListener('mousemove', moveBS);
                            // });
                        };  
                    })
                })
            });
        })
    })

    socket.on('authError', data=> {
        error_block.textContent = data
    })
})






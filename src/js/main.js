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
            img.src = 'images/strawberry.jpg';

            class AvatarImage {
                constructor(canvas, img){
                    const whRelation = img.width/img.height;

                    if (whRelation < 1) {
                        this.height = (img.height > canvas.height)?canvas.height:img.height;
                        this.width = Math.round((this.height * whRelation));
                    } else {
                        this.width = (img.width > canvas.width)?canvas.width:img.width;
                        this.height = Math.round((this.width / whRelation));
                        // console.log(Math.round(this.width / whRelation))
                    }

                    this.x = (canvas.width - this.width) / 2;
                    this.y = (canvas.height - this.height) / 2;
                    this.img = img;
                }

                init(ctx) {
                    ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
                }
            }

            class BorderSetter {
                constructor(avatar, sizePointer){
                    this.avatar = avatar;
                    this.size = (avatar.width > avatar.height)?avatar.height:avatar.width;
                    this.x = avatar.x;
                    this.y = avatar.y;
                    this.sizePointer = sizePointer;
                    this.DOMObject = null;
                    this.endPoints = {
                        topLeft: null,
                        topRight: null,
                        bottomRight: null,
                        bottomLeft: null
                    }
                }

                init(editor){
                    const that = this;
                    function createPoint(x, y, size, cursor) {
                        const point = document.createElement('div');
                        point.style.width = size + 'px';
                        point.style.height = size + 'px';
                        point.style.background = 'black';
                        point.style.position = 'absolute';
                        point.style.top = `${Math.round(y)}px`;
                        point.style.left = `${Math.round(x)}px`;
                        point.className = 'borderSetter__point'

                        point.addEventListener('mouseover', ()=>{
                            point.style.cursor = cursor;
                        })
                        point.addEventListener('mousedown', e=>{
                            e.preventDefault();
                            const pointEl = e.target;

                            function resize(offset){
                                // that.DOMObject.parentNode.style.cursor = 'move';
                                that.resize(offset.movementY, pointEl)
                            }

                            that.DOMObject.parentNode.addEventListener('mousemove', resize);
                            that.DOMObject.parentNode.addEventListener('mouseleave', (e)=>{
                                that.DOMObject.parentNode.removeEventListener('mousemove', resize);
                                that.DOMObject.parentNode.style.cursor = '';
                            });
                            that.DOMObject.parentNode.addEventListener('mouseup', ()=>{
                                that.DOMObject.parentNode.removeEventListener('mousemove', resize);
                                that.DOMObject.parentNode.style.cursor = '';
                            }, true);
                        })
                        return point
                    };

                    this.DOMObject = document.createElement('div');
                    const borderSetter = document.createElement('div');

                    this.DOMObject.style.width = this.size + 'px';
                    this.DOMObject.style.height = this.size + 'px';
                    this.DOMObject.style.border = '2px solid black';
                    this.DOMObject.style.position = 'absolute';
                    this.DOMObject.style.boxSizing = 'border-box';
                    this.DOMObject.style.top = this.y + 'px';
                    this.DOMObject.style.left = this.x + 'px';

                    this.DOMObject.addEventListener('mouseover', ()=>{
                        this.DOMObject.style.cursor = 'move';
                    });
                    this.DOMObject.addEventListener('mousedown', e=>{
                        const that = this;
                        
                        if(!e.target.classList.contains('borderSetter__point')){

                            function move(e){
                                that.move(e.movementX, e.movementY)
                            }
                            this.DOMObject.addEventListener('mousemove', move);
                            this.DOMObject.addEventListener('mouseup', e=>{
                                // this.DOMObject.style.cursor = '';
                                this.DOMObject.removeEventListener('mousemove', move);
                            }, true);
                            this.DOMObject.addEventListener('mouseleave', e=>{
                                this.DOMObject.style.cursor = '';
                                this.DOMObject.removeEventListener('mousemove', move);
                            }, true)
                        }
                        console.log('ok');
                    }, true)

                    borderSetter.style.width = '100%';
                    borderSetter.style.height = '100%';
                    borderSetter.style.background = 'rgba(0,0,0, .6)';
                    borderSetter.style.borderRadius = '50%';

                    this.endPoints.topLeft = createPoint(-(this.sizePointer/2), -(this.sizePointer/2), this.sizePointer, 'se-resize');
                    this.endPoints.topRight = createPoint(this.size - 4 -(this.sizePointer/2), - (this.sizePointer/2), this.sizePointer, 'sw-resize');
                    this.endPoints.bottomRight = createPoint(this.size - 4 - (this.sizePointer/2), this.size - 4 - (this.sizePointer/2), this.sizePointer, 'nw-resize');
                    this.endPoints.bottomLeft = createPoint(-(this.sizePointer/2), this.size - 4 - (this.sizePointer/2), this.sizePointer, 'ne-resize');

                    borderSetter.append(...Object.values(this.endPoints));
                    this.DOMObject.append(borderSetter);

                    editor.style.position = 'relative';

                    editor.append(this.DOMObject)
                }

                renderEndPoints(size){
                    const endPoints = this.endPoints;

                    endPoints.topLeft.style.top = `${-(this.sizePointer/2)}px`;
                    endPoints.topLeft.style.left = `${-(this.sizePointer/2)}px`;
                    
                    endPoints.topRight.style.top = -(this.sizePointer/2)+'px';
                    endPoints.topRight.style.left = `${size - 4 - (this.sizePointer/2)}px`;
                    
                    endPoints.bottomRight.style.top = `${size - 4 - (this.sizePointer/2)}px`;
                    endPoints.bottomRight.style.left = `${size - 4- (this.sizePointer/2)}px`;

                    endPoints.bottomLeft.style.top = `${size - 4 - (this.sizePointer/2)}px`;
                    endPoints.bottomLeft.style.left = `${-(this.sizePointer/2)}px`;
                }

                resize(offset, targetPoint){
                    // offset = offset>0?1:-1;

                    
                    const that = this;

                    function coordBound(xy, offset, up){
                        offset = up?(-offset):offset;

                        if((that[xy] + offset) >= that.avatar[xy]
                            &&(that[xy] + offset) + 50 <= that.avatar[(xy==='x')?'width':'height']+ that.avatar[(xy==='x')?'x':'y']
                            ) {
                                return that[xy] + offset;
                        } else return that[xy]
                    };


                    if (targetPoint === this.endPoints.topRight) {
                        this.y = coordBound('y', offset);
                        this.DOMObject.style.top = `${this.y}px`;
                        offset = -offset;
                    }

                    if (targetPoint === this.endPoints.topLeft) {
                        this.y = coordBound('y', offset);
                        this.x = coordBound('x', offset);
                        this.DOMObject.style.top = `${this.y}px`;
                        this.DOMObject.style.left = `${this.x}px`;
                        offset = -offset;
                    }

                    if (targetPoint === this.endPoints.bottomLeft) {
                        this.x = coordBound('x', offset, true);
                        
                        this.DOMObject.style.left = `${this.x}px`;
                    }

                    // console.log(this.x, this.avatar.x);
                    if ((this.size + offset+(this.x-this.avatar.x)) <= (this.avatar.width) 
                        &&((this.size + offset + (this.y-this.avatar.y)) <= (this.avatar.height))
                        && (this.size + offset>=50)
                        ){
                        this.size += offset;
                    }

                    this.DOMObject.style.width = `${this.size}px`;
                    this.DOMObject.style.height = `${this.size}px`;

                    this.renderEndPoints(this.size);
                }

                move(x, y){
                    if((this.x + x >= this.avatar.x) && (this.x + x+this.size<=this.avatar.width+this.avatar.x)){
                        this.x +=x;
                        this.DOMObject.style.left = `${this.x}px`
                    }
                    if((this.y + y >= this.avatar.y) && (this.y + y+this.size<=this.avatar.height+this.avatar.y)){
                        this.y +=y;
                        this.DOMObject.style.top = `${this.y}px`
                    }
                }
            }

            
            img.addEventListener('load', ()=>{
                const avatar = new AvatarImage(canvas, img);
                photoEditorSaveBtn.addEventListener('click', ()=>{
                    avatar.init(context);

                    const borderSetter = new BorderSetter(avatar, 12);
                    window.BS = borderSetter;
                    borderSetter.init(photoEditorArea);
                })
            });
        })
    })

    socket.on('authError', data=> {
        error_block.textContent = data
    })
})






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
        socket.off('getPassword');
        const currentUser = data.currentUser;
        let messAuthor = null;

        data.users.onlineCount = data.users.items.reduce((ac, el)=>{
            if (el.is_online) ++ac;
            return ac
        }, 0);
        wrapper.innerHTML = Handlebars.compile(mainTemplate.textContent)({
            currentUser: currentUser,
            users: data.users
        });

        data.messages.forEach(mess=>{
            let currentUserItem = users_list.querySelector(`[data-user="${mess.author}"]`);
            mess.ava = (currentUserItem.querySelector('img.usersBlock__item-avatar'))?currentUserItem.querySelector('img.usersBlock__item-avatar').src:null;
            renderMessage(mess, messAuthor, currentUser.nick);
            currentUserItem.querySelector('.usersBlock__item-message').textContent = mess.body;
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
            let currentUserItem = users_list.querySelector(`[data-user="${message.author}"]`);
            message.ava = (currentUserItem.querySelector('img.usersBlock__item-avatar'))?currentUserItem.querySelector('img.usersBlock__item-avatar').src:null;
            renderMessage(message, messAuthor, currentUser.nick);
            users_list.querySelector(`[data-user="${message.author}"]`).querySelector('.usersBlock__item-message').textContent = message.body;
            messAuthor = message.author
        });

        socket.on('avaUpdate', ava=> {
            const userItemInList = [...document.querySelector('.usersBlock__list').querySelectorAll('.usersBlock__item')]
                .find(el=>el.dataset.user === ava.user)
                if(!userItemInList.querySelector('img')){
                    const img = document.createElement('img');
                    img.className = 'usersBlock__item-avatar';
                    userItemInList.firstElementChild.firstElementChild.remove();
                    userItemInList.firstElementChild.prepend(img);
                }
                userItemInList.querySelector('img').src = ava.img;

            [...messagesArea.children]
                .filter(el=>{
                    return el.dataset.user === ava.user
                })
                .forEach(el=>{
                    if(!el.querySelector('img')){
                        const img = document.createElement('img');
                        img.className = 'messages-area__avatar';
                        el.firstElementChild.remove();
                        el.prepend(img);
                    }
                    el.querySelector('img').src = ava.img;
                })

            if(currentUser.nick === ava.user){
                if(!document.querySelector('#profileBlock .usersBlock__item-avatar')){
                    const img = document.createElement('img');
                    img.className = 'usersBlock__item-avatar';
                    profileBlock.firstElementChild.remove();
                    profileBlock.prepend(img);
                }

                document.querySelector('.usersBlock__item-avatar').src = ava.img;
            }
        });

        settingsBtn.addEventListener('click', ()=>{
            wrapper.style.filter = 'blur(3px)';

            const avaEditor = document.createElement('div');

            avaEditor.className = 'load-form__container';
            avaEditor.innerHTML = Handlebars.compile(photoEditor.textContent)();

            wrapper.after(avaEditor);


            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                getPhotoRegionBlock.addEventListener(eventName, e=>{
                    e.preventDefault();
                    e.stopPropagation()
                }, false)
            })

            getPhotoRegionBlock.addEventListener('dragenter', e=>{
                if(e.relatedTarget){
                    if(!e.relatedTarget.closest('#getPhotoRegionBlock')){
                        getPhotoRegionBlock.classList.add('photo-editor__edit-getPhoto_highlight')     
                    }
                }
            }, false);

            getPhotoRegionBlock.addEventListener('dragleave', e=>{
                if(e.relatedTarget){
                    if(!e.relatedTarget.closest('#getPhotoRegionBlock')){
                        getPhotoRegionBlock.classList.remove('photo-editor__edit-getPhoto_highlight')
                    }
                }
            }, false);


            getPhotoRegionBlock.addEventListener('drop', e=>{
                const cv = {
                    width: 320,
                    height: 320
                }
                const canvas = document.createElement('canvas');

                canvas.width = cv.width;
                canvas.height = cv.height;
                canvas.className = 'photo-editor__edit-canvas';

                const context = canvas.getContext("2d");

                getPhotoRegionBlock.remove();
                photoEditorArea.append(canvas);

                const dt = e.dataTransfer;
                const [file] = dt.files;
                const reader = new FileReader();

                reader.readAsDataURL(file);
                reader.addEventListener('load', () => {
                    const img = new Image();

                    img.src = reader.result;
                    img.addEventListener('load', ()=>{
                        let avatar = new AvatarImage(canvas, img);
                        avatar.render(context);

                        let borderSetter = new BorderSetter(avatar, 12);
                        borderSetter.init(photoEditorArea);

                        photoEditorSaveBtn.addEventListener('click', ()=>{
                            canvas.width = borderSetter.size;
                            canvas.height = borderSetter.size;

                            avatar.render(context, {x:-(borderSetter.x - avatar.x), y:-(borderSetter.y - avatar.y)});
                            const resIMG = canvas.toDataURL('image/jpg');

                            socket.emit('setImg', {
                                user: currentUser.nick,
                                img: resIMG
                            });
                            avaEditor.remove();
                            wrapper.style.filter = ''
                        })
                    });
                });

                class AvatarImage {
                    constructor(canvas, img, size){
                        const whRelation = img.width/img.height;

                        if(size){
                            this.height = size.height;
                            this.width = size.width
                        } else {
                            if (whRelation < 1) {
                                this.height = (img.height > canvas.height)?canvas.height:img.height;
                                this.width = Math.round((this.height * whRelation));
                            } else {
                                this.width = (img.width > canvas.width)?canvas.width:img.width;
                                this.height = Math.round((this.width / whRelation));
                                // console.log(Math.round(this.width / whRelation))
                            }
                        }
                        

                        this.x = (canvas.width - this.width) / 2;
                        this.y = (canvas.height - this.height) / 2;
                        this.img = img;
                    }

                    render(ctx, top = {x: this.x, y: this.y}) {
                        ctx.drawImage(this.img, top.x, top.y, this.width, this.height);
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
                                }, {once: true});
                                that.DOMObject.parentNode.addEventListener('mouseup', ()=>{
                                    that.DOMObject.parentNode.removeEventListener('mousemove', resize);
                                    that.DOMObject.parentNode.style.cursor = '';
                                }, {once: true, capture: true});
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
                        this.DOMObject.classList.add('DOMObject')
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

                    remove(){

                    }
                }   
            }, false)

            photoEditorCloseBtn.addEventListener('click', ()=>{
                avaEditor.remove();
                wrapper.style.filter = ''
            });

            photoEditorCancelBtn.addEventListener('click', ()=>{
                avaEditor.remove();
                wrapper.style.filter = ''
            })
        })
    })

    socket.on('authError', data=> {
        error_block.textContent = data
    })
})






/**
 * @file frontend js for the chat page
 * @author Warren Scantlebury
 * @namespace AuthChat
 */
var messageTemplate = `<li class="{{class}} {{status}}" id='{{id}}'><div class='message pending'> <div class='message__title'>    <h4>{{from}}</h4>    <span>{{createdAt}}</span>    <p class='reply' onclick="replyClick(this)">reply</p>    <!-- <div class="dropdown">            <span>Mouse over me</span>            <div class="dropdown-content">            <p>Hello World!</p>            </div>          </div> --></div><div class="message__body">    <p class="wrap">{{text}}</p> </div></div></li>`
var messageQuoteTemplate = `<li class="{{class}} {{status}}" id='{{id}}'><div class='message pending'><div class='message__title'>    <h4>{{from}}</h4>    <span>{{createdAt}}</span>    <p class='reply' onclick="replyClick(this)" >reply</p>    <!-- <div class="dropdown">            <span>Mouse over me</span>            <div class="dropdown-content">            <p>Hello World!</p>            </div>          </div> --></div><div class="message__body">    <p class="wrap"> {{text}}</p>    <span class="quoted">        <div class='message__title'>            <h4>{{quotedFrom}}</h4>            <span>{{quotedAt}}</span>        </div>         <p class="wrap">{{quotedMessage}}</p>            </span></div></div></li>`
// supposed to speed up future renders
Mustache.parse(messageTemplate)
Mustache.parse(messageQuoteTemplate)
var hID
var socket = io();
var typing = {};

// TODO: will this run several times for connection drops?
socket.on("connect", () => {
    var friendship_id = window.location.pathname.split('/')[3]
    /**
     * @function checkin
     * @todo add a kind of a queue to the DB (or from another service) so that we can get messages from that queue
     * @todo chat page specific logic for getting frienship ID should really use this to determine if to allow functionality on the page
     * @memberof AuthChat
     */
    socket.emit('checkin', { friendship_id  , token: getCookie("token") }, (err, data) => (!err ? console.log('checking successful') : console.log('checking unsuccessful') ))
    console.log('connected');

})
socket.on('newMessage', data => {
    console.log(data);
    
    // if its us then do nothing
    if (data.from === getUsername()) {
        return
    }
    // if we get a message about the other persons typing
    if (data.type === 'typing') {
        // if its saying the person has started typing
        if (data.status === 'start') {
            document.querySelector('.typing').style.opacity = '1'
                // if its saying the person has stopped typing
        } else if (data.status === 'stop') {
            document.querySelector('.typing').style.opacity = '0'
        }
        return
    }
    notifyMe({ from: data.from, message: data.text })
    var template
    var templateData = {
        text: data.text,
        from: (data.from === getUsername() ? 'me' : data.from),
        class: (data.from === getUsername() ? 'me' : 'them'),
        createdAt: new Date(data.createdAt).toLocaleTimeString(),
        id: `${data.Ids[0]}`
    }
    if (data.quoted) {
        templateData.quotedFrom = (data.quoted.from === getUsername() ? 'me' : data.quoted.from)
        templateData.quotedAt = new Date(data.quoted.createdAt).toLocaleTimeString()
        templateData.quotedMessage = data.quoted.text
        template = messageQuoteTemplate
    } else {
        template = messageTemplate
    }
    console.log(templateData);

    var html = Mustache.render(template, templateData)
    var nodeHTML = createElementFromHTML(html)
    console.log(nodeHTML);
    $('#messages').append(nodeHTML)
    var friendship_id = window.location.pathname.split('/')[3]
    socket.emit('gotMessage', { friendship_id ,token: getToken(), Ids: data.Ids}, () => console.log('message ticked'))
    scrollBottom()

})
socket.on('received', (data) => {
        data.forEach(Id => {
            let message = document.getElementById(Id)
            if(message){
                message.classList.remove("pending")
                message.classList.remove("sent")
                message.classList.add("received")
            }
        });
})
$("#friend-form").submit(e => {
    let username = e.target.username.value
    if (!isTrueString(username)) {
        alert('specify username to add')
        return false
    }
    $.ajax({
        type: "POST",
        url: '/api/users/me/friends',
        data: JSON.stringify({
            username: username
        }),
        headers: {
            'Content-type': 'application/json',
            'x-auth': getToken()
        },
        success: () => alert('friend successfully added'),
        error: function(err) {
            console.log(err);
            alert('error adding friend')
        },
        json: true
    });
    return false
})

$("#message-form").submit(e => {
    e.preventDefault()
    let text = $('#msg-txt').val()
    if (text.trim().length > 0) {
        var template = messageTemplate
        var templateData = {
            text: text,
            from: 'me',
            class: 'me',
            createdAt: new Date().toLocaleTimeString(),
            id: ``,
            status: 'pending'
        }
        // if we have a quoted message then we need to render that as well
        if(hID){
            // funny stuff for handling IDs that start with a number https://stackoverflow.com/questions/20306204/using-queryselector-with-ids-that-are-numbers
            // essentially if it starts with a number we have to convert that first number to unicode
            var selector = "#"+hID
            if(!isNaN(hID[0])){
                var num = hID[0]
                var partial = hID.slice(1)
                selector = "#\\3"+num +" "+partial
            }
            var messageNode = document.querySelector(selector)
            var nameAt = messageNode.querySelector('.message__title').children
            var quotedMessage = messageNode.querySelector('.message__body .wrap').innerHTML
            templateData.quotedFrom = nameAt[0].innerHTML
            templateData.quotedAt = new Date(parseInt(nameAt[1].innerHTML)).toLocaleTimeString()
            templateData.quotedMessage = quotedMessage

            template = messageQuoteTemplate
        }
        var html = Mustache.render(template, templateData)
        var nodeHTML = createElementFromHTML(html)
        console.log(nodeHTML);
        $('#messages').append(nodeHTML)
    
        scrollBottom()

        var friendship_id = window.location.pathname.split('/')[3]
        socket.emit('sendMessage', { friendship_id, hID, text: text, name: $.deparam(window.location.search).name }, (err, data) => {
            nodeHTML.id = data
            nodeHTML.classList.remove("pending")
            nodeHTML.classList.add("sent")
        })
        $('#msg-txt').focus()
        $('#msg-txt').val('')
        cancelReply()
        return false
    }
    cancelReply()
    return false
})

// update typing info for every keydown
$("#msg-txt").keydown(e => {
        var friendship_id = window.location.pathname.split('/')[3]
        // if we're already recorded as "typing"
    if (!typing.status) {
        socket.emit('sendMessage', { friendship_id, from: getUsername(), type: 'typing', status: 'start' }, () => console.log('typing sent'))
    }
    // set a timeout of 1 second every time we press a key
    typing.time = 1000
    typing.status = true
        // if we dont have and interval currently "decrementing" the "counter(typing.time)"
        // then start this interval
    if (!typing.interval) {
        typing.interval = setInterval(() => {
            // every 100 miliseconds we decrement by 100
            typing.time -= 100
                // if we've reached 0 seconds
            if (typing.time < 0) {
                // mark us as not typing and and clear and delete the interval
                typing.status = false;
                clearInterval(typing.interval)
                delete typing.interval
                socket.emit('sendMessage', { friendship_id, type: 'typing', status: 'stop' }, () => console.log('typing sent'))
            }
        }, 100);
    }

})

// open menu
$("#menu-button").click(e => {
        // sidebar to be opened
        document.getElementById('side').style['max-width'] = '1000px';//.classList.add('shown-for-mobile')
    })
    // close menu
$("#close").click(e => {
        document.getElementById('side').style['max-width'] = '0px';//.classList.add('shown-for-mobile')
        // document.getElementById('side').classList.remove('shown-for-mobile')
})


// open emojis
$("#emoji-button").click(e => {
    document.getElementById('my-emojis').classList.toggle('show')
    // TODO: this will scroll us to the bottom of the page even if we're are far from there
    // but for now its better than what currently happens
    scrollBottom(true);
})

// add the emoji to the text currently in the chat input field
$("#my-emojis").click(e => {
    if (e.target.dataset.value) {
        $('#msg-txt').val($('#msg-txt').val() + e.target.dataset.value).focus()
    }
})

// TODO: this seems to be unneeded, just route to the chat route
function startChat(e) {
    var friendship_id = $(e).attr('id')

    $.ajax({
        type: "POST",
        url: '/api/users/me/chat',
        data: JSON.stringify({
            friendship_id: friendship_id
        }),
        headers: {
            'Content-type': 'application/json',
            'x-auth': getToken()
        },
        success: (data) => {
            window.location.href = data.redirect
        },
        error: console.log,
        json: true
    });
    return false
}


var replyClick = (e) => {
    if (hID) {
        cancelReply()
        return replyClick(e)
    }
    var message = $(e).parent().parent().parent()
    hID = message.prop('id').replace('msg-', '')
    message.addClass('highlighted')
    $('#cancel-reply').removeClass('no-show')
    // $('#send-button').text('Reply')
    $('#msg-txt').attr('placeholder', 'reply to message...')
    $('#msg-txt').focus()
        // $('#message-form').append(cancelHtml)
    console.log(hID);
    
}


function cancelReply() {
    $('#cancel-reply').addClass('no-show')
        // $(`#${hID}`).removeClass('highlighted')
        // we may not have an element selected to reply
    let replyTo = document.getElementById(hID)
    if (replyTo) {
        replyTo.classList.remove('highlighted')
    }

    // $('#send-button').text('Send')
    $('#msg-txt').attr('placeholder', 'send message...')
    hID = null
}

$('.dropdown .small-img').click(() => {
    document.querySelector('.dropdown-content').classList.toggle('show')
    // document.querySelector('.dropdown-content').classList.remove('no-show')
})

function scrollBottom(force) {
    let messages = $("#messages")
    let newMessage = messages.children('li:last-child')

    let clientHeight = messages.prop('clientHeight')
    let scrollTop = messages.prop('scrollTop')
    let scrollHeight = messages.prop('scrollHeight')
    let newMessageHeight = newMessage.innerHeight()
    let lastMessageHeight = newMessage.prev().innerHeight()


    if ((clientHeight + scrollTop + newMessageHeight + lastMessageHeight >= scrollHeight) || force) {
        messages.scrollTop(scrollHeight + newMessageHeight)
        console.log("should scroll")
    }
}

function notifyMe(data) {
    let text = data.from + ': ' + data.message
        // Let's check if the browser supports notifications
    if (!("Notification" in window)) {
        alert("This browser does not support desktop notification");
    }

    // Let's check whether notification permissions have already been granted
    else if (Notification.permission === "granted") {
        // If it's okay let's create a notification
        var notification = new Notification(text);
    }

    // Otherwise, we need to ask the user for permission
    else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(function(permission) {
            // If the user accepts, let's create a notification
            if (permission === "granted") {
                var notification = new Notification(text);
            }
        });
    }

    // At last, if the user has denied notifications, and you 
    // want to be respectful there is no need to bother them any more.
}

function getUsername() {
    return document.cookie.replace((/(?:(?:^|.*;\s*)username\s*\=\s*([^;]*).*$)|^.*$/), "$1")
}
  
function logout(){
    setCookie('token', '', -1000)
    setCookie('username', '', -1000)
    window.location = '/login'
}


$('document').ready(e => scrollBottom(true))

function createElementFromHTML(htmlString) {
    var div = document.createElement('div');
    div.innerHTML = htmlString.trim();
  
    // Change this to div.childNodes to support multiple top-level nodes
    return div.firstChild; 
  }
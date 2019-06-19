messageTemplate = `<li class="{{class}}" id='{{id}}'><div class='message'> <div class='message__title'>    <h4>{{from}}</h4>    <span>{{createdAt}}</span>    <p class='reply' onclick="replyClick(this)">reply</p>    <!-- <div class="dropdown">            <span>Mouse over me</span>            <div class="dropdown-content">            <p>Hello World!</p>            </div>          </div> --></div><div class="message__body">    <p class="wrap">{{text}}</p> </div></div></li>`
messageQuoteTemplate = `<li class="{{class}}" id='{{id}}'><div class='message'><div class='message__title'>    <h4>{{from}}</h4>    <span>{{createdAt}}</span>    <p class='reply' onclick="replyClick(this)" >reply</p>    <!-- <div class="dropdown">            <span>Mouse over me</span>            <div class="dropdown-content">            <p>Hello World!</p>            </div>          </div> --></div><div class="message__body">    <p class="wrap"> {{text}}</p>    <span class="quoted">        <div class='message__title'>            <h4>{{quotedFrom}}</h4>            <span>{{quotedAt}}</span>        </div>         <p class="wrap">{{quotedMessage}}</p>            </span></div></div></li>`
var hID
var socket = io();
var typing = {};

socket.on("connect", () => {
    console.log('connected');

})
socket.on('newMessage', data => {
    // if we get a message about the other persons typing
    if (data.type === 'typing') {
        // if its us then do nothing
        if (data.from === getUsername()) {
            return
        }
        // if its saying the person has started typing
        if (data.status === 'start') {
            document.querySelector('.typing').style.opacity = '1'
                // if its saying the person has stopped typing
        } else if (data.status === 'stop') {
            document.querySelector('.typing').style.opacity = '0'
        }
        return
    }
    if (data.from !== getUsername()) {
        notifyMe({ from: data.from, message: data.text })
    }
    var template
    var templateData = {
        text: data.text,
        from: (data.from === getUsername() ? 'me' : data.from),
        class: (data.from === getUsername() ? 'me' : 'them'),
        createdAt: data.createdAt.toLocaleString(),
        id: `${data.id}`
    }
    if (data.quoted) {
        templateData.quotedFrom = (data.quoted.from === getUsername() ? 'me' : data.quoted.from)
        templateData.quotedAt = data.quoted.createdAt.toLocaleString()
        templateData.quotedMessage = data.quoted.text
        template = messageQuoteTemplate
    } else {
        template = messageTemplate
    }
    console.log(templateData);

    var html = Mustache.render(template, templateData)
    console.log(data)
        // let name = $.deparam(window.location.search).name
        // let chatChild = document.createElement('li')
        // chatChild.innerHTML = `${(data.name === name) ? 'me' : data.name}: ${data.text}`
    $('#messages')
        .html($('#messages').html() + html)
        // .hover(messageHoverIn, messageHoverOut)

    scrollBottom()

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
        socket.emit('sendMessage', { hID, text: text, name: $.deparam(window.location.search).name }, () => console.log('message sent'))
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
    // if we're already recorded as "typing"
    if (!typing.status) {
        socket.emit('sendMessage', { from: getUsername(), type: 'typing', status: 'start' }, () => console.log('typing sent'))
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
                socket.emit('sendMessage', { type: 'typing', status: 'stop' }, () => console.log('typing sent'))
            }
        }, 100);
    }

})

// open menu
$("#menu-button").click(e => {
        // sidebar to be opened
        document.getElementById('side').classList.add('shown-for-mobile')
    })
    // close menu
$("#close").click(e => {
    document.getElementById('side').classList.remove('shown-for-mobile')
})


// open emojis
$("#emoji-button").click(e => {
    // sidebar to be opened
    document.getElementById('my-emojis').classList.toggle('show')
    scrollBottom();
})

// add the emoji to the text currently in the chat input field
$("#my-emojis").click(e => {
    if (e.target.dataset.value) {
        $('#msg-txt').val($('#msg-txt').val() + e.target.dataset.value).focus()
    }
})

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
    $('#send-button').text('Reply')
    $('#msg-txt').attr('placeholder', 'reply to message...')
    $('#msg-txt').focus()
        // $('#message-form').append(cancelHtml)
}


function cancelReply() {
    $('#cancel-reply').addClass('no-show')
        // $(`#${hID}`).removeClass('highlighted')
        // we may not have an element selected to reply
    let replyTo = document.getElementById(hID)
    if (replyTo) {
        replyTo.classList.remove('highlighted')
    }

    $('#send-button').text('Send')
    $('#msg-txt').attr('placeholder', 'send message...')
    hID = null
}

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
$('document').ready(e => scrollBottom(true))
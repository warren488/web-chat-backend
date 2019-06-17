messageTemplate = `<li class='message' id='{{id}}'><div class='message__title'>    <h4>{{from}}</h4>    <span>{{createdAt}}</span>    <p class='reply' onclick="replyClick(this)">reply</p>    <!-- <div class="dropdown">            <span>Mouse over me</span>            <div class="dropdown-content">            <p>Hello World!</p>            </div>          </div> --></div><div class="message__body">    <p class="wrap">{{text}}</p> </div></li>`
messageQuoteTemplate = ` <li class='message' id='{{id}}'><div class='message__title'>    <h4>{{from}}</h4>    <span>{{createdAt}}</span>    <p class='reply' onclick="replyClick(this)" >reply</p>    <!-- <div class="dropdown">            <span>Mouse over me</span>            <div class="dropdown-content">            <p>Hello World!</p>            </div>          </div> --></div><div class="message__body">    <p class="wrap"> {{text}}</p>    <span class="quoted">        <div class='message__title'>            <h4>{{quotedFrom}}</h4>            <span>{{quotedAt}}</span>        </div>         <p class="wrap">{{quotedMessage}}</p>            </span></div></li>`
var hID
var socket = io();
socket.on("connect", () => {
    console.log('connected');

})
socket.on('newMessage', data => {
    console.log(data)
    var template
    var templateData = {
        text: data.text,
        from: data.from,
        createdAt: data.createdAt.toLocaleString(),
        id: `msg-${data.id}`
    }
    if (data.quoted) {
        templateData.quotedFrom = data.quoted.from
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
    let text = $('#msg-txt').val()
    if (text.trim().length > 0) {
        socket.emit('sendMessage', { hID, text: text, name: $.deparam(window.location.search).name }, () => console.log('message sent'))
        $('#msg-txt').focus()
        $('#msg-txt').val('')
        cancelReply()
    }
    cancelReply()
    return false
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
        $('#msg-txt').val($('#msg-txt').val() + e.target.dataset.value)
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
    var message = $(e).parent().parent()
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
    $(`#msg-${hID}`).removeClass('highlighted')
    $('#send-button').text('Send')
    $('#msg-txt').attr('placeholder', 'send message...')
    hID = null
}

function scrollBottom() {

    let messages = $("#messages")
    let newMessage = messages.children('li:last-child')

    let clientHeight = messages.prop('clientHeight')
    let scrollTop = messages.prop('scrollTop')
    let scrollHeight = messages.prop('scrollHeight')
    let newMessageHeight = newMessage.innerHeight()
    let lastMessageHeight = newMessage.prev().innerHeight()


    if (clientHeight + scrollTop + newMessageHeight + lastMessageHeight >= scrollHeight) {
        messages.scrollTop(scrollHeight + newMessageHeight)
        console.log("should scroll")
    }
}
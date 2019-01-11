// for some reason normal var doesnt work here
let name = undefined
let chatName
var hID = null

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

let socket = io();
socket.on("connect", () => {
    let params = $.deparam(window.location.search)
    socket.emit('join', params, (err) => {
        if (err) {
            alert(err)
            window.location.href = '/'
        }
        name = params.name
        console.log('no error');

    })
    console.log('connected to the server');
})
socket.on("disconnect", () => {
    console.log('disconnected from server');
})

socket.on('newMessage', data => {

    var template
    templateData = {
        text: data.text,
        from: data.name,
        createdAt: data.createdAt,
        id: `msg-${data.id}`
    }
    if (data.quoted) {
        templateData.quotedFrom = data.quoted.name
        templateData.quotedAt = data.quoted.createdAt
        templateData.quotedMessage = data.quoted.text
        template = $('#message-quote').html()
    } else {
        template = $('#message-template').html()
    }
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

socket.on('addusername', users => {
    var userString = users.join(', ')
    userString = userString.replace(name, "Me")

    $('.panel-title').text(userString)
})

socket.on('updateUList', users => {
    let ol = $('<ul></ul>')
    users.forEach(user => {
        ol.append($('<li></li>').text(user))
    });
    $('#users').html(ol)
    console.log(users);
})


$('#message-form').on('submit', () => {

    // if (!name) {
    //     console.log('name: ', name);
    //     alert('please enter a name first')
    //     return false;
    // }
    let text = $('#msg-txt').val()
    if (text.trim().length > 0) {
        socket.emit('sendMessage', { hID, text: text, name: $.deparam(window.location.search).name }, () => console.log('message sent'))
        $('#msg-txt').val('')
        cancelReply()
    }

    return false
})


$('#name-picker').on('submit', () => {
    name = $('#name-input').val()
    socket.emit('startChat', { name })
    return false
})

function messageHoverIn() {
    console.log('hoverin');
    
    $(this).find('.reply').addClass('reply-highlight')
}

function messageHoverOut() {
    $(this).find('.reply').removeClass('reply-highlight')

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
// for some reason normal var doesnt work here
let name = undefined
let chatName

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

    var template = $('#message-template').html()
    var html = Mustache.render(template, {
        text: data.text,
        from: data.name,
        createdAt: data.createdAt
    })
    console.log(data)
    // let name = $.deparam(window.location.search).name
    // let chatChild = document.createElement('li')
    // chatChild.innerHTML = `${(data.name === name) ? 'me' : data.name}: ${data.text}`
    $('#messages').html($('#messages').html() + html)

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
        socket.emit('sendMessage', { text: text, name: $.deparam(window.location.search).name }, () => console.log('message sent'))
        $('#msg-txt').val('')
    }

    return false
})


$('#name-picker').on('submit', () => {
    name = $('#name-input').val()
    socket.emit('startChat', { name })
    return false
})


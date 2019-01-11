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
    console.log('connected to the server');
})
socket.on("disconnect", () => {
    console.log('disconnected from server');
})

socket.on('newMessage', (data) => {
    console.log(data)
    var chatChild
    if (data.name === name) {
        chatChild = document.createElement('li')
        chatChild.innerHTML = `${data.name}: ${data.text}`
        $('.chat__messages')[0].append(chatChild)
    } else {
        chatChild = document.createElement('li')
        chatChild.innerHTML = `${'me'}: ${data.text}`
        $('.chat__messages')[0].append(chatChild)
    }
    scrollBottom()

})

socket.on('addusername', (users) => {
    var userString = users.join(', ')
    userString = userString.replace(name, "Me")

    $('.panel-title').text(userString)
})




$('#message-form').on('submit', () => {

    // if (!name) {
    //     console.log('name: ', name);
    //     alert('please enter a name first')
    //     return false;
    // }
    let text = $('#msg-txt').val()
    socket.emit('sendMessage', { text: text, name: 'Suzan' }, () => console.log('message sent'))
    $('#msg-txt').val('')
    console.log(text)
    return false
})


$('#name-picker').on('submit', () => {
    name = $('#name-input').val()
    socket.emit('startChat', { name })
    return false
})


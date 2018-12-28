// for some reason normal var doesnt work here
let name = undefined
let chatName

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
        chatChild = document.createElement('div')
        chatChild.innerHTML = '<div class="row msg_container base_sent">\
        <div class="col-md-10 col-xs-10">\
          <div class="messages msg_sent">\
            <p>'+ data.text + '</p>\
            <time datetime="2009-11-13T20:00">me • '+ data.createdAt + '</time>\
          </div>\
        </div>\
        <div class="col-md-2 col-xs-2 avatar">\
          <img src="http://www.bitrebels.com/wp-content/uploads/2011/02/Original-Facebook-Geek-Profile-Avatar-1.jpg"\
            class=" img-responsive ">\
        </div>\
      </div>'
        $('#msg_container').append(chatChild)
    } else {
        chatChild = document.createElement('div')
        chatChild.innerHTML = '\
            <div class="row msg_container base_receive">\
                <div class="col-md-2 col-xs-2 avatar">\
                    <img src="http://www.bitrebels.com/wp-content/uploads/2011/02/Original-Facebook-Geek-Profile-Avatar-1.jpg"\
                        class=" img-responsive ">\
              </div>\
                    <div class="col-md-10 col-xs-10">\
                        <div class="messages msg_receive">\
                            <p>'+ data.text + '</p>\
                            <time datetime="2009-11-13T20:00">'+ data.name + ' • ' + data.createdAt + '</time>\
                        </div>\
                    </div>\
                </div>\''
        $('#msg_container').append(chatChild)
    }

})

socket.on('addusername', (users) => {
    var userString = users.join(', ')
    userString = userString.replace(name, "Me")
    
    $('.panel-title').text(userString)
})




$(document).on('click', "#btn-chat", () => {

    if (!name) {
        console.log('name: ', name);
        alert('please enter a name first')
        return
    }
    let text = $('#btn-input').val()
    socket.emit('sendMessage', { text: text, name: name })
    console.log(text)
})

$(document).on('click', "#btn-name", () => {
    name = $('#btn-name').val()
    socket.emit('startChat', { name })

})